import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { Persona } from '../entities/persona.entity';
import { Patente } from '../entities/patente.entity';
import { CuotaPatente } from '../entities/cuota-patente.entity';

const CAMPOS_PERSONA = [
  'tipo_doc',
  'nro_doc',
  'cuit',
  'nombre',
  'apellido',
  'calle_domicilio',
  'numero_domicilio',
  'piso_domicilio',
  'depto_domicilio',
  'localidad',
  'provincia',
  'telefono',
  'email',
];

const CAMPOS_PATENTE_INTERNAL = [
  'nombre',
  'apellido',
  'tipo_doc',
  'nro_doc',
  'cuit',
  'domicilio',
  'cantidad_cuotas',
  'tramo',
  'numero_patente',
  'marca',
  'modelo',
  'tipo',
  'capital',
  'intereses',
];

function letraColumnaAIndice(letra: string): number {
  const l = letra.toUpperCase().trim();
  if (l.length === 1) {
    return l.charCodeAt(0) - 65;
  }
  if (l.length === 2) {
    return (l.charCodeAt(0) - 64) * 26 + (l.charCodeAt(1) - 65);
  }
  return -1;
}

function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Eliminación total de espacios para matching agresivo */
function normalizarEstricto(texto: string): string {
  return normalizarTexto(texto).replace(/\s+/g, '');
}

/** 
 * Genera un hash determinístico para comparar personas por nombre y domicilio 
 * cuando no tienen documento.
 */
function generarIdentificadorUnico(row: any): string {
  const nombre = normalizarTexto(row.nombre || '');
  const apellido = normalizarTexto(row.apellido || '');
  const apNom = normalizarTexto(row.apellido_nombre || '');
  const calle = normalizarTexto(row.calle_domicilio || '');
  const nro = normalizarTexto(row.numero_domicilio || '');
  const loc = normalizarTexto(row.localidad || '');

  // Si no tenemos docs, necesitamos nombre y algo de domicilio
  if (!nombre && !apellido && !apNom) return '';
  return `${apellido}|${nombre}|${apNom}|${calle}|${nro}|${loc}`;
}

@Injectable()
export class ImportacionesService {
  constructor(
    @InjectRepository(Persona)
    private personaRepository: Repository<Persona>,
    @InjectRepository(Patente)
    private patenteRepository: Repository<Patente>,
    @InjectRepository(CuotaPatente)
    private cuotaPatenteRepository: Repository<CuotaPatente>,
  ) { }

  parseCsv(
    fileBuffer: Buffer,
    columnMapping: Record<string, string>,
  ): { headers: string[]; rows: Record<string, string>[] } {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const headers = records.length > 0 ? Object.keys(records[0]) : [];

    const mappedRows: Record<string, string>[] = [];
    const camposValidos = Object.keys(columnMapping).some(k => k === 'numero_patente' || CAMPOS_PATENTE_INTERNAL.includes(k)) 
      ? CAMPOS_PATENTE_INTERNAL 
      : CAMPOS_PERSONA;

    for (const record of records as Record<string, string>[]) {
      const row: Record<string, string> = {};
      for (const [campo, letra] of Object.entries(columnMapping)) {
        if (!letra || (!CAMPOS_PERSONA.includes(campo) && !CAMPOS_PATENTE_INTERNAL.includes(campo))) continue;
        const indice = letraColumnaAIndice(letra);
        if (indice >= 0 && indice < headers.length) {
          row[campo] = record[headers[indice]] ?? '';
        }
      }
      mappedRows.push(row);
    }

    return { headers, rows: mappedRows };
  }

  async previewImportPersonas(
    rows: Record<string, string>[],
    idEntidad: number,
  ): Promise<{
    totalFilas: number;
    nuevas: Record<string, unknown>[];
    existentes: Record<string, unknown>[];
  }> {
    if (rows.length === 0) {
      return { totalFilas: 0, nuevas: [], existentes: [] };
    }

    // 1. Recolectar datos para bulk queries
    const nroDocs = new Set<string>();
    const cuits = new Set<string>();

    rows.forEach(r => {
      if (r.nro_doc?.trim()) nroDocs.add(r.nro_doc.trim());
      if (r.cuit?.trim()) cuits.add(r.cuit.trim());
    });

    // 2. Query masiva por documentos
    const existentesDocumento = await this.personaRepository.find({
      where: [
        { idEntidad, nroDoc: In(Array.from(nroDocs)) },
        { idEntidad, cuit: In(Array.from(cuits)) }
      ],
      select: ['id', 'nroDoc', 'cuit', 'nombre', 'apellido', 'calleDomicilio', 'numeroDomicilio', 'localidad']
    });

    // 3. Query por nombre/domicilio para los que no tienen doc (optimizado)
    // Nota: Por performance en grandes sets, consultamos todos los de la entidad 
    // y aplicamos el matching en memoria si el set es manejable, o filtramos los que no tienen doc.
    const todasLasPersonasDeEntidad = await this.personaRepository.find({
      where: { idEntidad },
      select: ['id', 'nroDoc', 'cuit', 'nombre', 'apellido', 'apellidoNombre', 'calleDomicilio', 'numeroDomicilio', 'localidad']
    });

    // Construir sets de búsqueda rápida
    const docSet = new Set(existentesDocumento.map(p => p.nroDoc).filter(d => !!d));
    const cuitSet = new Set(existentesDocumento.map(p => p.cuit).filter(c => !!c));
    const hashSet = new Set(todasLasPersonasDeEntidad.map(p => generarIdentificadorUnico({
      nombre: p.nombre,
      apellido: p.apellido,
      apellido_nombre: p.apellidoNombre,
      calle_domicilio: p.calleDomicilio,
      numero_domicilio: p.numeroDomicilio,
      localidad: p.localidad
    })).filter(h => !!h));

    const existentes: Record<string, unknown>[] = [];
    const nuevas: Record<string, unknown>[] = [];

    for (const row of rows) {
      // Normalización previa para el matching (misma lógica que en import)
      const isNameUnified = row.nombre && row.apellido && row.nombre === row.apellido;
      const rowForHash = { ...row };
      if (isNameUnified) {
        rowForHash.apellido_nombre = row.nombre;
        rowForHash.nombre = '';
        rowForHash.apellido = '';
      }

      const dni = (rowForHash.nro_doc ?? '').trim();
      const cuit = (rowForHash.cuit ?? '').trim();

      let existe = false;
      if (dni && docSet.has(dni)) existe = true;
      else if (cuit && cuitSet.has(cuit)) existe = true;
      else {
        const hash = generarIdentificadorUnico(rowForHash);
        if (hash && hashSet.has(hash)) existe = true;
      }

      const filaResultado = {
        ...row,
        nombre: isNameUnified ? '' : row.nombre,
        apellido: isNameUnified ? '' : row.apellido,
        apellido_nombre: isNameUnified ? row.nombre : row.apellido_nombre,
        existente: existe
      };
      if (existe) existentes.push(filaResultado);
      else nuevas.push(filaResultado);
    }

    return { totalFilas: rows.length, nuevas, existentes };
  }

  async previewImportPatentes(
    rows: Record<string, string>[],
    idEntidad: number,
  ): Promise<{
    totalFilas: number;
    nuevas: Record<string, unknown>[];
    existentes: Record<string, unknown>[];
    sinPersona: Record<string, unknown>[];
  }> {
    if (rows.length === 0) {
      return { totalFilas: 0, nuevas: [], existentes: [], sinPersona: [] };
    }

    // 1. Cargar personas para matching
    const personas = await this.personaRepository.find({
      where: { idEntidad },
      select: ['id', 'nombre', 'apellido', 'apellidoNombre', 'nroDoc', 'cuit']
    });

    // 2. Cargar patentes existentes para evitar duplicados en el import
    const patentesExistentes = await this.patenteRepository.find({
      where: { persona: { idEntidad } },
      select: ['numero_patente']
    });
    const setPatentesExistentes = new Set(
      patentesExistentes.map(p => normalizarEstricto(p.numero_patente))
    );

    const existentes: Record<string, unknown>[] = [];
    const sinPersona: Record<string, unknown>[] = [];

    // Helper para buscar persona (con la lógica agresiva ya implementada)
    const buscarPersona = (row: any) => {
      const nom = normalizarTexto(row.nombre || '');
      const ape = normalizarTexto(row.apellido || '');
      const apNom = normalizarTexto(row.apellido_nombre || '');
      const dni = (row.nro_doc || '').trim();

      if (dni) {
        const p = personas.find(p => p.nroDoc === dni);
        if (p) return p;
      }

      const exactMatch = personas.find(p => {
        const pNom = normalizarTexto(p.nombre);
        const pApe = normalizarTexto(p.apellido);
        const pApNom = normalizarTexto(p.apellidoNombre);
        if (apNom && pApNom === apNom) return true;
        if (nom && ape && pNom === nom && pApe === ape) return true;
        return false;
      });
      if (exactMatch) return exactMatch;

      const estrictoCSV = normalizarEstricto(apNom || `${ape}${nom}`);
      return personas.find(p => {
        const estrictoDB = normalizarEstricto(p.apellidoNombre || `${p.apellido}${p.nombre}`);
        const estrictoDBReverso = normalizarEstricto(`${p.nombre}${p.apellido}`);
        return estrictoDB === estrictoCSV || estrictoDBReverso === estrictoCSV;
      });
    };

    const obtenerSugerencias = (row: any) => {
      const textoBuscado = normalizarTexto(`${row.apellido || ''} ${row.nombre || ''} ${row.apellido_nombre || ''}`);
      const palabrasBuscadas = textoBuscado.split(/\s+/).filter(p => p.length > 3);
      if (palabrasBuscadas.length === 0) return [];
      const resultados: { p: any; coincencias: number }[] = [];
      for (const p of personas) {
        const textoPersona = normalizarTexto(`${p.apellido || ''} ${p.nombre || ''} ${p.apellidoNombre || ''}`);
        let coincencias = 0;
        for (const pal of palabrasBuscadas) {
          if (textoPersona.includes(pal)) coincencias++;
        }
        if (coincencias > 0) resultados.push({ p, coincencias });
      }
      return resultados
        .sort((a, b) => b.coincencias - a.coincencias)
        .slice(0, 10)
        .map(res => ({ 
          id: res.p.id, 
          nombre: res.p.apellidoNombre || `${res.p.apellido}, ${res.p.nombre}` 
        }));
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Validar si la patente ya existe en la DB
      const nroPatenteLimpio = normalizarEstricto(row.numero_patente || '');
      if (nroPatenteLimpio && setPatentesExistentes.has(nroPatenteLimpio)) {
        continue; // Omitir patentes que ya existen para esta entidad
      }

      const isNameUnified = row.nombre && row.apellido && row.nombre === row.apellido;
      const rowProcessed = { 
        ...row,
        originalIndex: i, // Guardamos el indice original para el mapping del frontend
        nombre: isNameUnified ? '' : row.nombre,
        apellido: isNameUnified ? '' : row.apellido,
        apellido_nombre: isNameUnified ? row.nombre : (row.apellido_nombre || '')
      };

      const personaMatch = buscarPersona(rowProcessed);

      if (personaMatch) {
        // Guardamos el match automático
        existentes.push({ ...rowProcessed, idPersona: personaMatch.id, personaMatch });
      } else {
        // Guardamos para resolución manual
        const sugerencias = obtenerSugerencias(rowProcessed);
        sinPersona.push({ ...rowProcessed, sugerencias });
      }
    }

    return {
      totalFilas: rows.length,
      nuevas: [],
      existentes, // Estos tienen match automático
      sinPersona // Estos requieren match manual
    };
  }

  async importPersonas(
    rows: Record<string, string>[],
    idEntidad: number,
  ): Promise<{ cantidadAgregadas: number }> {
    if (rows.length === 0) return { cantidadAgregadas: 0 };

    // 1. Obtener todos los existentes una vez para matching ultra rápido en memoria
    const existentes = await this.personaRepository.find({
      where: { idEntidad },
      select: ['id', 'nroDoc', 'cuit', 'nombre', 'apellido', 'apellidoNombre', 'calleDomicilio', 'numeroDomicilio', 'localidad']
    });

    const docSet = new Set(existentes.map(p => p.nroDoc).filter(d => !!d));
    const cuitSet = new Set(existentes.map(p => p.cuit).filter(c => !!c));
    const hashSet = new Set(existentes.map(p => generarIdentificadorUnico({
      nombre: p.nombre,
      apellido: p.apellido,
      apellido_nombre: p.apellidoNombre,
      calle_domicilio: p.calleDomicilio,
      numero_domicilio: p.numeroDomicilio,
      localidad: p.localidad
    })).filter(h => !!h));

    // 2. Filtrar solo las que no existen bajo ningún criterio
    const nuevasParaInsertar = rows.filter(row => {
      const isNameUnified = row.nombre && row.apellido && row.nombre === row.apellido;
      const rowForHash = { ...row };
      if (isNameUnified) {
        rowForHash.apellido_nombre = row.nombre;
        rowForHash.nombre = '';
        rowForHash.apellido = '';
      }

      const dni = (rowForHash.nro_doc ?? '').trim();
      const cuit = (rowForHash.cuit ?? '').trim();

      if (dni && docSet.has(dni)) return false;
      if (cuit && cuitSet.has(cuit)) return false;

      const hash = generarIdentificadorUnico(rowForHash);
      if (hash && hashSet.has(hash)) return false;

      return true;
    });

    if (nuevasParaInsertar.length === 0) return { cantidadAgregadas: 0 };

    // 3. Crear entidades
    const entidadesPersona = nuevasParaInsertar.map(row => {
      const nombreCSV = (row.nombre ?? '').trim();
      const apellidoCSV = (row.apellido ?? '').trim();

      let nombreFinal = '';
      let apellidoFinal = '';
      let apellidoNombreFinal = '';

      // Regla: Si Nombre y Apellido apuntan a la misma columna (o letra)
      if (row.nombre && row.apellido && row.nombre === row.apellido) {
        apellidoNombreFinal = nombreCSV;
        nombreFinal = '';
        apellidoFinal = '';
      } else {
        // Lógica estándar o split
        nombreFinal = nombreCSV;
        apellidoFinal = apellidoCSV;
        const apNomCSV = (row.apellido_nombre ?? '').trim();

        if (apNomCSV && (!nombreFinal || !apellidoFinal)) {
          const partes = apNomCSV.split(/\s+/);
          if (partes.length > 1) {
            apellidoFinal = partes.slice(0, partes.length - 1).join(' ');
            nombreFinal = partes[partes.length - 1];
          } else {
            nombreFinal = apNomCSV;
            apellidoFinal = '';
          }
        }
        apellidoNombreFinal = apNomCSV || `${apellidoFinal}, ${nombreFinal}`.replace(/^, |, $/, '');
      }

      return this.personaRepository.create({
        tipoDoc: row.tipo_doc?.trim() || 'DNI',
        nroDoc: row.nro_doc?.trim() || null,
        cuit: row.cuit?.trim() || null,
        apellidoNombre: apellidoNombreFinal || null,
        nombre: nombreFinal || '',
        apellido: apellidoFinal || '',
        calleDomicilio: row.calle_domicilio?.trim() || null,
        numeroDomicilio: row.numero_domicilio?.trim() || null,
        pisoDomicilio: row.piso_domicilio?.trim() || null,
        deptoDomicilio: row.depto_domicilio?.trim() || null,
        localidad: row.localidad?.trim() || null,
        provincia: row.provincia?.trim() || null,
        telefono: row.telefono?.trim() || null,
        email: row.email?.trim() || null,
        listaTelefonos: row.telefono?.trim() ? [row.telefono.trim()] : [],
        listaEmails: row.email?.trim() ? [row.email.trim()] : [],
        idEntidad,
        habilitado: true
      });
    });

    // 4. Inserción en bloques
    const chunkSize = 500;
    for (let i = 0; i < entidadesPersona.length; i += chunkSize) {
      const chunk = entidadesPersona.slice(i, i + chunkSize);
      await this.personaRepository.save(chunk);
    }

    return { cantidadAgregadas: entidadesPersona.length };
  }

  async importPatentes(
    rows: Record<string, string>[],
    personLinks: Record<number, number>, // Mapping from originalIndex to idPersona
    idEntidad: number,
  ): Promise<{ patentesNuevas: number; cuotasInsertadas: number }> {
    if (rows.length === 0) return { patentesNuevas: 0, cuotasInsertadas: 0 };

    const patentesMap = new Map<string, {
      patenteData: any,
      originalIndex: number,
      cuotas: any[],
    }>();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nroPatenteOriginal = row.numero_patente || '';
        const nroPatenteLimpio = normalizarEstricto(nroPatenteOriginal);
        if (!nroPatenteLimpio) continue;

        if (!patentesMap.has(nroPatenteLimpio)) {
            const personaId = personLinks[i]; 
            if (!personaId) continue;
            
            patentesMap.set(nroPatenteLimpio, {
                patenteData: {
                    numero_patente: nroPatenteOriginal.toUpperCase().trim(),
                    marca: row.marca?.trim() || null,
                    modelo: row.modelo?.trim() || null,
                    marcaModelo: (row.marca === row.modelo && row.marca) ? row.marca?.trim() : null,
                    tipo: row.tipo?.trim() || null,
                    tramo: row.tramo?.trim() || null,
                    domicilio: row.domicilio?.trim() || null,
                    idPersona: personaId
                },
                originalIndex: i,
                cuotas: []
            });
        }

        const capitalStr = (row.capital || '').replace(/[^0-9,-]/g, '').replace(',', '.');
        const interesesStr = (row.intereses || '').replace(/[^0-9,-]/g, '').replace(',', '.');
        const cantCuotas = parseInt(row.cantidad_cuotas || '1', 10) || 1;

        // "puede haber mas de una cuota por dominio", guardamos todas las que vengan en las rows
        patentesMap.get(nroPatenteLimpio).cuotas.push({
            numero_cuota: cantCuotas, 
            cantidad_cuotas: cantCuotas,
            capital: parseFloat(capitalStr) || 0,
            intereses: parseFloat(interesesStr) || 0,
            vencimiento: new Date() // No viene en los campos
        });
    }

    if (patentesMap.size === 0) return { patentesNuevas: 0, cuotasInsertadas: 0 };

    let patentesAgregadasCount = 0;

    const patentesDb = await this.patenteRepository.find({
        where: { persona: { idEntidad } },
        relations: ['persona']
    });
    
    const patentesExistentesMap = new Map<string, number>();
    for (const p of patentesDb) {
        patentesExistentesMap.set(normalizarEstricto(p.numero_patente), p.id);
    }

    const nuevasPatentesToInsert = [];

    for (const [key, val] of patentesMap.entries()) {
        if (!patentesExistentesMap.has(key)) {
            nuevasPatentesToInsert.push(
                this.patenteRepository.create(val.patenteData)
            );
        }
    }

    if (nuevasPatentesToInsert.length > 0) {
        const insertResult = await this.patenteRepository.save(nuevasPatentesToInsert);
        patentesAgregadasCount += insertResult.length;
        for (const p of insertResult) {
            patentesExistentesMap.set(normalizarEstricto(p.numero_patente), p.id);
        }
    }

    // Process quotas
    const involvedDomainsIds = Array.from(patentesMap.keys())
        .map(k => patentesExistentesMap.get(k))
        .filter(id => !!id);

    if (involvedDomainsIds.length > 0) {
        for (let i = 0; i < involvedDomainsIds.length; i += 500) {
            const chunk = involvedDomainsIds.slice(i, i + 500);
            await this.cuotaPatenteRepository.delete({
                idPatente: In(chunk)
            });
        }
    }

    const cuotasToInsert = [];
    for (const [key, val] of patentesMap.entries()) {
        const patenteId = patentesExistentesMap.get(key);
        if (!patenteId) continue;

        for (const c of val.cuotas) {
            cuotasToInsert.push(
                this.cuotaPatenteRepository.create({
                    ...c,
                    idPatente: patenteId
                })
            );
        }
    }

    let cuotasAgregadasCount = 0;
    if (cuotasToInsert.length > 0) {
        for (let i = 0; i < cuotasToInsert.length; i += 500) {
            const chunk = cuotasToInsert.slice(i, i + 500);
            await this.cuotaPatenteRepository.save(chunk);
        }
        cuotasAgregadasCount = cuotasToInsert.length;
    }

    return { patentesNuevas: patentesAgregadasCount, cuotasInsertadas: cuotasAgregadasCount };
  }
}
