import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { Persona } from '../entities/persona.entity';
import { Patente } from '../entities/patente.entity';
import { CuotaPatente } from '../entities/cuota-patente.entity';
import { TgiUrbano } from '../entities/tgi-urbano.entity';
import { CuotaTgiUrbano } from '../entities/cuota-tgi-urbano.entity';
import { TgiRural } from '../entities/tgi-rural.entity';
import { CuotaTgiRural } from '../entities/cuota-tgi-rural.entity';

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

const CAMPOS_TGI_URBANO_INTERNAL = [
  'nombre',
  'apellido',
  'tipo_doc',
  'nro_doc',
  'cuit',
  'numero_padron',
  'codigo_web',
  'sup_terreno',
  'mts_frente',
  'manzana',
  'cantidad_cuotas',
  'tramo',
  'capital',
  'intereses',
];

const CAMPOS_TGI_RURAL_INTERNAL = [
  'nombre',
  'apellido',
  'numero_padron',
  'direccion_padron',
  'manzana',
  'sup_hectarea',
  'cantidad_cuotas',
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

type FilaNombreMatching = {
  nombre?: string;
  apellido?: string;
  apellido_nombre?: string;
};

type PersonaMatchingRow = {
  nombre: string;
  apellido: string;
  apellidoNombre?: string | null;
  nroDoc?: string | null;
  cuit?: string | null;
  calleDomicilio?: string | null;
  numeroDomicilio?: string | null;
  localidad?: string | null;
};

type PersonaMatchingSets = {
  docSet: Set<string>;
  cuitSet: Set<string>;
  hashSet: Set<string>;
  nombreClavesSet: Set<string>;
};

/** Solo usar documento si tiene más de 3 caracteres (evita "0" u otros prefijos cortos). */
function clavesDniParaMatch(nroDoc?: string | null): string[] {
  const trimmed = (nroDoc ?? '').trim();
  if (trimmed.length <= 3) return [];
  const claves = [trimmed];
  if (trimmed.length > 3) claves.push(trimmed.substring(1));
  return claves;
}

function clavesCuitParaMatch(cuit?: string | null): string[] {
  const trimmed = (cuit ?? '').trim();
  if (trimmed.length <= 3) return [];
  return [trimmed];
}

function prepararFilaParaMatching(row: FilaNombreMatching): {
  nombre: string;
  apellido: string;
  apellido_nombre: string;
} {
  const nombre = (row.nombre ?? '').trim();
  const apellido = (row.apellido ?? '').trim();
  const apNom = (row.apellido_nombre ?? '').trim();

  if (nombre && apellido && nombre === apellido) {
    return { nombre: '', apellido: '', apellido_nombre: nombre };
  }
  if (nombre && !apellido && !apNom) {
    return { nombre: '', apellido: '', apellido_nombre: nombre };
  }
  if (!nombre && apellido && !apNom) {
    return { nombre: '', apellido: '', apellido_nombre: apellido };
  }
  if (apNom && (!nombre || !apellido)) {
    return { nombre, apellido, apellido_nombre: apNom };
  }
  return { nombre, apellido, apellido_nombre: apNom };
}

function todasLasClavesNombre(row: FilaNombreMatching): string[] {
  const prep = prepararFilaParaMatching(row);
  const nom = normalizarTexto(prep.nombre);
  const ape = normalizarTexto(prep.apellido);
  const apNom = normalizarTexto(prep.apellido_nombre);
  const claves = new Set<string>();

  if (apNom) claves.add(normalizarEstricto(apNom));
  if (nom && ape) {
    claves.add(normalizarEstricto(`${ape}${nom}`));
    claves.add(normalizarEstricto(`${nom}${ape}`));
  } else if (nom) claves.add(normalizarEstricto(nom));
  else if (ape) claves.add(normalizarEstricto(ape));

  return [...claves].filter(Boolean);
}

function generarHashesIdentidad(row: {
  nombre?: string;
  apellido?: string;
  apellido_nombre?: string;
  calle_domicilio?: string;
  numero_domicilio?: string;
  localidad?: string;
}): string[] {
  const clavesNombre = todasLasClavesNombre(row);
  if (clavesNombre.length === 0) return [];

  const calle = normalizarTexto(row.calle_domicilio || '');
  const nro = normalizarTexto(row.numero_domicilio || '');
  const loc = normalizarTexto(row.localidad || '');
  const sufijo = `|${calle}|${nro}|${loc}`;

  return clavesNombre.map((k) => `${k}${sufijo}`);
}

function buildMatchingSets(personas: PersonaMatchingRow[]): PersonaMatchingSets {
  const docSet = new Set<string>();
  const cuitSet = new Set<string>();
  const hashSet = new Set<string>();
  const nombreClavesSet = new Set<string>();

  for (const p of personas) {
    for (const k of clavesDniParaMatch(p.nroDoc)) docSet.add(k);
    for (const k of clavesCuitParaMatch(p.cuit)) cuitSet.add(k);

    const row = {
      nombre: p.nombre,
      apellido: p.apellido,
      apellido_nombre: p.apellidoNombre ?? '',
      calle_domicilio: p.calleDomicilio ?? '',
      numero_domicilio: p.numeroDomicilio ?? '',
      localidad: p.localidad ?? '',
    };
    for (const k of todasLasClavesNombre(row)) nombreClavesSet.add(k);
    for (const h of generarHashesIdentidad(row)) hashSet.add(h);
  }

  return { docSet, cuitSet, hashSet, nombreClavesSet };
}

function personaExisteEnSets(
  row: Record<string, string>,
  sets: PersonaMatchingSets,
): boolean {
  for (const k of clavesDniParaMatch(row.nro_doc)) {
    if (sets.docSet.has(k)) return true;
  }
  for (const k of clavesCuitParaMatch(row.cuit)) {
    if (sets.cuitSet.has(k)) return true;
  }

  const clavesNombre = todasLasClavesNombre(row);
  if (clavesNombre.some((k) => sets.nombreClavesSet.has(k))) return true;

  const hashes = generarHashesIdentidad(row);
  return hashes.some((h) => sets.hashSet.has(h));
}

function datosNombreParaPersistir(row: Record<string, string>) {
  const prep = prepararFilaParaMatching(row);
  let nombreFinal = prep.nombre;
  let apellidoFinal = prep.apellido;
  let apellidoNombreFinal = prep.apellido_nombre;

  if (apellidoNombreFinal && !nombreFinal && !apellidoFinal) {
    // Nombre unificado en apellidoNombre
  } else if (nombreFinal || apellidoFinal) {
    apellidoNombreFinal =
      apellidoNombreFinal ||
      `${apellidoFinal}, ${nombreFinal}`.replace(/^, |, $/, '').trim();
  }

  return {
    nombre: nombreFinal || '',
    apellido: apellidoFinal || '',
    apellidoNombre: apellidoNombreFinal || null,
  };
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
    @InjectRepository(TgiUrbano)
    private tgiUrbanoRepository: Repository<TgiUrbano>,
    @InjectRepository(CuotaTgiUrbano)
    private cuotaTgiUrbanoRepository: Repository<CuotaTgiUrbano>,
    @InjectRepository(TgiRural)
    private tgiRuralRepository: Repository<TgiRural>,
    @InjectRepository(CuotaTgiRural)
    private cuotaTgiRuralRepository: Repository<CuotaTgiRural>,
  ) {}

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
    const isPatente = Object.keys(columnMapping).some(
      (k) => k === 'numero_patente',
    );
    const isTgiUrbano = Object.keys(columnMapping).some(
      (k) => k === 'codigo_web',
    );
    const isTgiRural = Object.keys(columnMapping).some(
      (k) => k === 'sup_hectarea',
    );

    const camposValidos = isPatente
      ? CAMPOS_PATENTE_INTERNAL
      : isTgiUrbano
        ? CAMPOS_TGI_URBANO_INTERNAL
        : isTgiRural
          ? CAMPOS_TGI_RURAL_INTERNAL
          : CAMPOS_PERSONA;

    for (const record of records as Record<string, string>[]) {
      const row: Record<string, string> = {};
      for (const [campo, letra] of Object.entries(columnMapping)) {
        if (!letra || !camposValidos.includes(campo)) continue;
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

    const personasEntidad = await this.cargarPersonasParaMatching(idEntidad);
    const sets = buildMatchingSets(personasEntidad);

    const existentes: Record<string, unknown>[] = [];
    const nuevas: Record<string, unknown>[] = [];

    for (const row of rows) {
      const existe = personaExisteEnSets(row, sets);
      const prep = prepararFilaParaMatching(row);

      const filaResultado = {
        ...row,
        nombre: prep.nombre,
        apellido: prep.apellido,
        apellido_nombre: prep.apellido_nombre,
        existente: existe,
      };
      if (existe) existentes.push(filaResultado);
      else nuevas.push(filaResultado);
    }

    return { totalFilas: rows.length, nuevas, existentes };
  }

  private async cargarPersonasParaMatching(
    idEntidad: number,
  ): Promise<PersonaMatchingRow[]> {
    return this.personaRepository.find({
      where: { idEntidad },
      select: [
        'id',
        'nroDoc',
        'cuit',
        'nombre',
        'apellido',
        'apellidoNombre',
        'calleDomicilio',
        'numeroDomicilio',
        'localidad',
      ],
    });
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
      select: ['id', 'nombre', 'apellido', 'apellidoNombre', 'nroDoc', 'cuit'],
    });

    // 2. Cargar patentes existentes para evitar duplicados en el import
    const patentesExistentes = await this.patenteRepository.find({
      where: { persona: { idEntidad } },
      select: ['numero_patente'],
    });
    const setPatentesExistentes = new Set(
      patentesExistentes.map((p) => normalizarEstricto(p.numero_patente)),
    );

    const existentes: Record<string, unknown>[] = [];
    const sinPersona: Record<string, unknown>[] = [];

    // Helper para buscar persona (con la lógica agresiva ya implementada)
    const buscarPersona = (row: any) => {
      const nom = normalizarTexto(row.nombre || '');
      const ape = normalizarTexto(row.apellido || '');
      const apNom = normalizarTexto(row.apellido_nombre || '');
      // Obtener DNI para match si tiene mas de 3 caracteres. Remover el primer dígito.
      const dni =
        row.nro_doc?.length > 3 ? row.nro_doc.trim().substring(1) : '';
      const cuit = row.cuit?.length > 3 ? row.cuit.trim() : '';

      const exactMatch = personas.find((p) => {
        const pNom = normalizarTexto(p.nombre);
        const pApe = normalizarTexto(p.apellido);
        const pApNom = normalizarTexto(p.apellidoNombre);
        if (apNom && pApNom === apNom) return true;
        if (nom && ape && pNom === nom && pApe === ape) return true;
        return false;
      });
      if (exactMatch) return exactMatch;

      if (dni) {
        const p = personas.find((p) => p.nroDoc === dni);
        if (p) return p;
      }

      if (cuit) {
        const p = personas.find((p) => p.cuit === cuit);
        if (p) return p;
      }

      const estrictoCSV = normalizarEstricto(apNom || `${ape}${nom}`);
      return personas.find((p) => {
        const estrictoDB = normalizarEstricto(
          p.apellidoNombre || `${p.apellido}${p.nombre}`,
        );
        const estrictoDBReverso = normalizarEstricto(
          `${p.nombre}${p.apellido}`,
        );
        return estrictoDB === estrictoCSV || estrictoDBReverso === estrictoCSV;
      });
    };

    const obtenerSugerencias = (row: any) => {
      const textoBuscado = normalizarTexto(
        `${row.apellido || ''} ${row.nombre || ''} ${row.apellido_nombre || ''}`,
      );
      const palabrasBuscadas = textoBuscado
        .split(/\s+/)
        .filter((p) => p.length > 3);
      if (palabrasBuscadas.length === 0) return [];
      const resultados: { p: any; coincencias: number }[] = [];
      for (const p of personas) {
        const textoPersona = normalizarTexto(
          `${p.apellido || ''} ${p.nombre || ''} ${p.apellidoNombre || ''}`,
        );
        let coincencias = 0;
        for (const pal of palabrasBuscadas) {
          if (textoPersona.includes(pal)) coincencias++;
        }
        if (coincencias > 0) resultados.push({ p, coincencias });
      }
      const primeraPalabra = palabrasBuscadas[0];
      const segundaPalabra = palabrasBuscadas[1];

      return resultados
        .sort((a, b) => b.coincencias - a.coincencias)
        .map((res) => {
          const textoPersona = normalizarTexto(
            res.p.apellidoNombre || `${res.p.apellido} ${res.p.nombre}`,
          );
          // Si coinciden las primeras dos palabras (o al menos están presentes al inicio), marcamos como alta confianza
          const esMatchAltaConfianza =
            primeraPalabra &&
            segundaPalabra &&
            textoPersona.includes(primeraPalabra) &&
            textoPersona.includes(segundaPalabra);

          return {
            id: res.p.id,
            nombre:
              res.p.apellidoNombre || `${res.p.apellido}, ${res.p.nombre}`,
            esMatchAltaConfianza,
          };
        });
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Validar si la patente ya existe en la DB
      const nroPatenteLimpio = normalizarEstricto(row.numero_patente || '');
      if (nroPatenteLimpio && setPatentesExistentes.has(nroPatenteLimpio)) {
        continue; // Omitir patentes que ya existen para esta entidad
      }

      const isNameUnified =
        row.nombre && row.apellido && row.nombre === row.apellido;
      const rowProcessed = {
        ...row,
        originalIndex: i, // Guardamos el indice original para el mapping del frontend
        nombre: isNameUnified ? '' : row.nombre,
        apellido: isNameUnified ? '' : row.apellido,
        apellido_nombre: isNameUnified ? row.nombre : row.apellido_nombre || '',
      };

      const personaMatch = buscarPersona(rowProcessed);

      if (personaMatch) {
        // Guardamos el match automático
        existentes.push({
          ...rowProcessed,
          idPersona: personaMatch.id,
          personaMatch,
        });
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
      sinPersona, // Estos requieren match manual
    };
  }

  async previewImportTgiUrbano(
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

    const personas = await this.personaRepository.find({
      where: { idEntidad },
      select: ['id', 'nombre', 'apellido', 'apellidoNombre', 'nroDoc', 'cuit'],
    });

    const tgiExistentes = await this.tgiUrbanoRepository.find({
      where: { persona: { idEntidad } },
      select: ['numero_padron'],
    });
    const setPadronesExistentes = new Set(
      tgiExistentes.map((p) => normalizarEstricto(p.numero_padron)),
    );

    const existentes: Record<string, unknown>[] = [];
    const sinPersona: Record<string, unknown>[] = [];

    const buscarPersona = (row: any) => {
      const nom = normalizarTexto(row.nombre || '');
      const ape = normalizarTexto(row.apellido || '');
      const apNom = normalizarTexto(row.apellido_nombre || '');
      const dni = row.nro_doc?.length > 3 ? row.nro_doc.trim() : '';
      const cuit = row.cuit?.length > 3 ? row.cuit.trim() : '';

      const exactMatch = personas.find((p) => {
        const pNom = normalizarTexto(p.nombre);
        const pApe = normalizarTexto(p.apellido);
        const pApNom = normalizarTexto(p.apellidoNombre);
        if (apNom && pApNom === apNom) return true;
        if (nom && ape && pNom === nom && pApe === ape) return true;
        return false;
      });
      if (exactMatch) return exactMatch;

      if (dni) {
        const p = personas.find(
          (p) => p.nroDoc === dni || p.nroDoc?.includes(dni),
        );
        if (p) return p;
      }
      if (cuit) {
        const p = personas.find((p) => p.cuit === cuit);
        if (p) return p;
      }

      const estrictoCSV = normalizarEstricto(apNom || `${ape}${nom}`);
      return personas.find((p) => {
        const estrictoDB = normalizarEstricto(
          p.apellidoNombre || `${p.apellido}${p.nombre}`,
        );
        const estrictoDBReverso = normalizarEstricto(
          `${p.nombre}${p.apellido}`,
        );
        return estrictoDB === estrictoCSV || estrictoDBReverso === estrictoCSV;
      });
    };

    const obtenerSugerencias = (row: any) => {
      const textoBuscado = normalizarTexto(
        `${row.apellido || ''} ${row.nombre || ''} ${row.apellido_nombre || ''}`,
      );
      const palabrasBuscadas = textoBuscado
        .split(/\s+/)
        .filter((p) => p.length > 3);
      if (palabrasBuscadas.length === 0) return [];
      const resultados: { p: any; coincencias: number }[] = [];
      for (const p of personas) {
        const textoPersona = normalizarTexto(
          `${p.apellido || ''} ${p.nombre || ''} ${p.apellidoNombre || ''}`,
        );
        let coincencias = 0;
        for (const pal of palabrasBuscadas) {
          if (textoPersona.includes(pal)) coincencias++;
        }
        if (coincencias > 0) resultados.push({ p, coincencias });
      }
      const primeraPalabra = palabrasBuscadas[0];
      const segundaPalabra = palabrasBuscadas[1];

      return resultados
        .sort((a, b) => b.coincencias - a.coincencias)
        .map((res) => {
          const textoPersona = normalizarTexto(
            res.p.apellidoNombre || `${res.p.apellido} ${res.p.nombre}`,
          );
          const esMatchAltaConfianza =
            primeraPalabra &&
            segundaPalabra &&
            textoPersona.includes(primeraPalabra) &&
            textoPersona.includes(segundaPalabra);

          return {
            id: res.p.id,
            nombre:
              res.p.apellidoNombre || `${res.p.apellido}, ${res.p.nombre}`,
            esMatchAltaConfianza,
          };
        });
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nroPadronLimpio = normalizarEstricto(row.numero_padron || '');
      if (nroPadronLimpio && setPadronesExistentes.has(nroPadronLimpio)) {
        // En TGI solemos permitir actualización de cuotas aunque el padrón exista
      }

      const isNameUnified =
        row.nombre && row.apellido && row.nombre === row.apellido;
      const rowProcessed = {
        ...row,
        originalIndex: i,
        nombre: isNameUnified ? '' : row.nombre,
        apellido: isNameUnified ? '' : row.apellido,
        apellido_nombre: isNameUnified ? row.nombre : row.apellido_nombre || '',
      };

      const personaMatch = buscarPersona(rowProcessed);

      if (personaMatch) {
        existentes.push({
          ...rowProcessed,
          idPersona: personaMatch.id,
          personaMatch,
        });
      } else {
        const sugerencias = obtenerSugerencias(rowProcessed);
        sinPersona.push({ ...rowProcessed, sugerencias });
      }
    }

    return {
      totalFilas: rows.length,
      nuevas: [],
      existentes,
      sinPersona,
    };
  }

  async importPersonas(
    rows: Record<string, string>[],
    idEntidad: number,
  ): Promise<{ cantidadAgregadas: number }> {
    if (rows.length === 0) return { cantidadAgregadas: 0 };

    const personasEntidad = await this.cargarPersonasParaMatching(idEntidad);
    const sets = buildMatchingSets(personasEntidad);

    const nuevasParaInsertar = rows.filter(
      (row) => !personaExisteEnSets(row, sets),
    );

    if (nuevasParaInsertar.length === 0) return { cantidadAgregadas: 0 };

    const entidadesPersona = nuevasParaInsertar.map((row) => {
      const { nombre, apellido, apellidoNombre } = datosNombreParaPersistir(row);

      return this.personaRepository.create({
        tipoDoc: row.tipo_doc?.trim() || 'DNI',
        nroDoc: row.nro_doc?.trim() || null,
        cuit: row.cuit?.trim() || null,
        apellidoNombre,
        nombre,
        apellido,
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
        habilitado: true,
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

    const patentesMap = new Map<
      string,
      {
        patenteData: any;
        originalIndex: number;
        cuotas: any[];
      }
    >();

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
            marca: row.marca?.trim() || 'Sin marca',
            modelo: row.modelo?.trim() || 'Sin modelo',
            marcaModelo:
              row.marca === row.modelo && row.marca ? row.marca?.trim() : null,
            tipo: row.tipo?.trim() || 'Sin tipo',
            tramo: row.tramo?.trim() || null,
            domicilio: row.domicilio?.trim() || null,
            idPersona: personaId,
          },
          originalIndex: i,
          cuotas: [],
        });
      }

      const capitalStr = (row.capital || '')
        .replace(/[^0-9,-]/g, '')
        .replace(',', '.');
      const interesesStr = (row.intereses || '')
        .replace(/[^0-9,-]/g, '')
        .replace(',', '.');
      const cantCuotas = parseInt(row.cantidad_cuotas || '1', 10) || 1;

      // "puede haber mas de una cuota por dominio", guardamos todas las que vengan en las rows
      patentesMap.get(nroPatenteLimpio).cuotas.push({
        numero_cuota: cantCuotas,
        cantidad_cuotas: cantCuotas,
        capital: parseFloat(capitalStr) || 0,
        intereses: parseFloat(interesesStr) || 0,
        vencimiento: new Date(), // No viene en los campos
      });
    }

    if (patentesMap.size === 0)
      return { patentesNuevas: 0, cuotasInsertadas: 0 };

    let patentesAgregadasCount = 0;

    const patentesDb = await this.patenteRepository.find({
      where: { persona: { idEntidad } },
      relations: ['persona'],
    });

    const patentesExistentesMap = new Map<string, number>();
    for (const p of patentesDb) {
      patentesExistentesMap.set(normalizarEstricto(p.numero_patente), p.id);
    }

    const nuevasPatentesToInsert = [];

    for (const [key, val] of patentesMap.entries()) {
      if (!patentesExistentesMap.has(key)) {
        nuevasPatentesToInsert.push(
          this.patenteRepository.create(val.patenteData),
        );
      }
    }

    if (nuevasPatentesToInsert.length > 0) {
      const insertResult = await this.patenteRepository.save(
        nuevasPatentesToInsert,
      );
      patentesAgregadasCount += insertResult.length;
      for (const p of insertResult) {
        patentesExistentesMap.set(normalizarEstricto(p.numero_patente), p.id);
      }
    }

    // Process quotas
    const involvedDomainsIds = Array.from(patentesMap.keys())
      .map((k) => patentesExistentesMap.get(k))
      .filter((id) => !!id);

    if (involvedDomainsIds.length > 0) {
      for (let i = 0; i < involvedDomainsIds.length; i += 500) {
        const chunk = involvedDomainsIds.slice(i, i + 500);
        await this.cuotaPatenteRepository.delete({
          idPatente: In(chunk),
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
            idPatente: patenteId,
          }),
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

    return {
      patentesNuevas: patentesAgregadasCount,
      cuotasInsertadas: cuotasAgregadasCount,
    };
  }

  async importTgiUrbano(
    rows: Record<string, string>[],
    personLinks: Record<number, number>,
    idEntidad: number,
  ): Promise<{ tgiNuevos: number; cuotasInsertadas: number }> {
    if (rows.length === 0) return { tgiNuevos: 0, cuotasInsertadas: 0 };

    const tgiMap = new Map<
      string,
      {
        tgiData: any;
        originalIndex: number;
        cuotas: any[];
      }
    >();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nroPadronOriginal = row.numero_padron || '';
      const nroPadronLimpio = normalizarEstricto(nroPadronOriginal);
      if (!nroPadronLimpio) continue;

      if (!tgiMap.has(nroPadronLimpio)) {
        const personaId = personLinks[i];
        if (!personaId) continue;

        tgiMap.set(nroPadronLimpio, {
          tgiData: {
            numero_padron: nroPadronOriginal.toUpperCase().trim(),
            codigo_web: row.codigo_web?.trim() || '',
            domicilio:
              row.domicilio?.trim() || row.direccion_padron?.trim() || '',
            sup_terreno:
              parseFloat((row.sup_terreno || '0').replace(',', '.')) || 0,
            mts_frente:
              parseFloat((row.mts_frente || '0').replace(',', '.')) || 0,
            manzana: row.manzana?.trim() || null,
            idPersona: personaId,
          },
          originalIndex: i,
          cuotas: [],
        });
      }

      const capitalStr = (row.capital || '')
        .replace(/[^0-9,-]/g, '')
        .replace(',', '.');
      const interesesStr = (row.intereses || '')
        .replace(/[^0-9,-]/g, '')
        .replace(',', '.');
      const cantCuotas = parseInt(row.cantidad_cuotas || '1', 10) || 1;

      tgiMap.get(nroPadronLimpio).cuotas.push({
        numero_cuota: cantCuotas,
        cantidad_cuotas: cantCuotas,
        capital: parseFloat(capitalStr) || 0,
        intereses: parseFloat(interesesStr) || 0,
        vencimiento: new Date(),
        tramo: row.tramo?.trim() || null,
      });
    }

    if (tgiMap.size === 0) return { tgiNuevos: 0, cuotasInsertadas: 0 };

    let tgiAgregadosCount = 0;
    const tgiDb = await this.tgiUrbanoRepository.find({
      where: { persona: { idEntidad } },
      relations: ['persona'],
    });

    const tgiExistentesMap = new Map<string, number>();
    for (const t of tgiDb) {
      tgiExistentesMap.set(normalizarEstricto(t.numero_padron), t.id);
    }

    const nuevosTgiToInsert = [];
    const tgiToUpdate = [];

    for (const [key, val] of tgiMap.entries()) {
      const existenteId = tgiExistentesMap.get(key);
      if (!existenteId) {
        nuevosTgiToInsert.push(this.tgiUrbanoRepository.create(val.tgiData));
      } else {
        tgiToUpdate.push({
          id: existenteId,
          ...val.tgiData,
        });
      }
    }

    if (nuevosTgiToInsert.length > 0) {
      for (let i = 0; i < nuevosTgiToInsert.length; i += 500) {
        const chunk = nuevosTgiToInsert.slice(i, i + 500);
        const insertResult = await this.tgiUrbanoRepository.save(chunk);
        tgiAgregadosCount += insertResult.length;
        for (const t of insertResult) {
          tgiExistentesMap.set(normalizarEstricto(t.numero_padron), t.id);
        }
      }
    }

    if (tgiToUpdate.length > 0) {
      for (let i = 0; i < tgiToUpdate.length; i += 500) {
        const chunk = tgiToUpdate.slice(i, i + 500);
        await this.tgiUrbanoRepository.save(chunk);
      }
    }

    const involvedIds = Array.from(tgiMap.keys())
      .map((k) => tgiExistentesMap.get(k))
      .filter((id) => !!id);

    if (involvedIds.length > 0) {
      for (let i = 0; i < involvedIds.length; i += 500) {
        const chunk = involvedIds.slice(i, i + 500);
        await this.cuotaTgiUrbanoRepository.delete({ idTgiUrbano: In(chunk) });
      }
    }

    const cuotasToInsert = [];
    for (const [key, val] of tgiMap.entries()) {
      const tgiId = tgiExistentesMap.get(key);
      if (!tgiId) continue;
      for (const c of val.cuotas) {
        cuotasToInsert.push(
          this.cuotaTgiUrbanoRepository.create({ ...c, idTgiUrbano: tgiId }),
        );
      }
    }

    if (cuotasToInsert.length > 0) {
      for (let i = 0; i < cuotasToInsert.length; i += 500) {
        const chunk = cuotasToInsert.slice(i, i + 500);
        await this.cuotaTgiUrbanoRepository.save(chunk);
      }
    }

    return {
      tgiNuevos: tgiAgregadosCount,
      cuotasInsertadas: cuotasToInsert.length,
    };
  }

  async previewImportTgiRural(
    rows: Record<string, string>[],
    idEntidad: number,
  ): Promise<any> {
    const personas = await this.personaRepository.find({
      where: { idEntidad },
      select: ['id', 'nombre', 'apellido', 'apellidoNombre', 'nroDoc', 'cuit'],
    });

    const tgiExistentes = await this.tgiRuralRepository.find({
      where: { persona: { idEntidad } },
      select: ['numero_padron'],
    });
    const setPadronesExistentes = new Set(
      tgiExistentes.map((p) => normalizarEstricto(p.numero_padron)),
    );

    const existentes: Record<string, unknown>[] = [];
    const sinPersona: Record<string, unknown>[] = [];

    const buscarPersona = (row: any) => {
      const nom = normalizarTexto(row.nombre || '');
      const ape = normalizarTexto(row.apellido || '');
      const apNom = normalizarTexto(row.apellido_nombre || '');

      const estrictoCSV = normalizarEstricto(apNom || `${ape}${nom}`);
      return personas.find((p) => {
        const estrictoDB = normalizarEstricto(
          p.apellidoNombre || `${p.apellido}${p.nombre}`,
        );
        const estrictoDBReverso = normalizarEstricto(
          `${p.nombre}${p.apellido}`,
        );
        return estrictoDB === estrictoCSV || estrictoDBReverso === estrictoCSV;
      });
    };

    const obtenerSugerencias = (row: any) => {
      const textoBuscado = normalizarTexto(
        `${row.apellido || ''} ${row.nombre || ''} ${row.apellido_nombre || ''}`,
      );
      const palabrasBuscadas = textoBuscado
        .split(/\s+/)
        .filter((p) => p.length > 3);
      if (palabrasBuscadas.length === 0) return [];
      const resultados: { p: any; coincencias: number }[] = [];
      for (const p of personas) {
        const textoPersona = normalizarTexto(
          `${p.apellido || ''} ${p.nombre || ''} ${p.apellidoNombre || ''}`,
        );
        let coincencias = 0;
        for (const pal of palabrasBuscadas) {
          if (textoPersona.includes(pal)) coincencias++;
        }
        if (coincencias > 0) resultados.push({ p, coincencias });
      }
      const primeraPalabra = palabrasBuscadas[0];
      const segundaPalabra = palabrasBuscadas[1];

      return resultados
        .sort((a, b) => b.coincencias - a.coincencias)
        .map((res) => {
          const textoPersona = normalizarTexto(
            res.p.apellidoNombre || `${res.p.apellido} ${res.p.nombre}`,
          );
          const esMatchAltaConfianza =
            primeraPalabra &&
            segundaPalabra &&
            textoPersona.includes(primeraPalabra) &&
            textoPersona.includes(segundaPalabra);

          return {
            id: res.p.id,
            nombre:
              res.p.apellidoNombre || `${res.p.apellido}, ${res.p.nombre}`,
            esMatchAltaConfianza,
          };
        });
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nroPadronLimpio = normalizarEstricto(row.numero_padron || '');
      const isNameUnified =
        row.nombre && row.apellido && row.nombre === row.apellido;
      const rowProcessed = {
        ...row,
        originalIndex: i,
        nombre: isNameUnified ? '' : row.nombre,
        apellido: isNameUnified ? '' : row.apellido,
        apellido_nombre: isNameUnified ? row.nombre : row.apellido_nombre || '',
      };

      const personaMatch = buscarPersona(rowProcessed);

      if (personaMatch) {
        existentes.push({
          ...rowProcessed,
          idPersona: personaMatch.id,
          personaMatch,
        });
      } else {
        sinPersona.push({
          ...rowProcessed,
          sugerencias: obtenerSugerencias(rowProcessed),
        });
      }
    }

    return { totalFilas: rows.length, nuevas: [], existentes, sinPersona };
  }

  async importTgiRural(
    rows: Record<string, string>[],
    personLinks: Record<number, number>,
    idEntidad: number,
  ): Promise<{ tgiNuevos: number; cuotasInsertadas: number }> {
    if (rows.length === 0) return { tgiNuevos: 0, cuotasInsertadas: 0 };

    const tgiMap = new Map<
      string,
      {
        tgiData: any;
        originalIndex: number;
        cuotas: any[];
      }
    >();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nroPadronOriginal = row.numero_padron || '';
      const nroPadronLimpio = normalizarEstricto(nroPadronOriginal);
      if (!nroPadronLimpio) continue;

      if (!tgiMap.has(nroPadronLimpio)) {
        const personaId = personLinks[i];
        if (!personaId) continue;

        tgiMap.set(nroPadronLimpio, {
          tgiData: {
            numero_padron: nroPadronOriginal.toUpperCase().trim(),
            codigo_web: row.codigo_web?.trim() || '',
            domicilio: row.direccion_padron?.trim() || '',
            sup_hectarea:
              parseFloat((row.sup_hectarea || '0').replace(',', '.')) || 0,
            manzana: row.manzana?.trim() || null,
            idPersona: personaId,
          },
          originalIndex: i,
          cuotas: [],
        });
      }

      const capitalStr = (row.capital || '')
        .replace(/[^0-9,-]/g, '')
        .replace(',', '.');
      const interesesStr = (row.intereses || '')
        .replace(/[^0-9,-]/g, '')
        .replace(',', '.');
      const cantCuotas = parseInt(row.cantidad_cuotas || '1', 10) || 1;

      tgiMap.get(nroPadronLimpio).cuotas.push({
        numero_cuota: cantCuotas,
        cantidad_cuotas: cantCuotas,
        capital: parseFloat(capitalStr) || 0,
        intereses: parseFloat(interesesStr) || 0,
        vencimiento: new Date(),
      });
    }

    if (tgiMap.size === 0) return { tgiNuevos: 0, cuotasInsertadas: 0 };

    let tgiAgregadosCount = 0;
    const tgiDb = await this.tgiRuralRepository.find({
      where: { persona: { idEntidad } },
      relations: ['persona'],
    });

    const tgiExistentesMap = new Map<string, number>();
    for (const t of tgiDb) {
      tgiExistentesMap.set(normalizarEstricto(t.numero_padron), t.id);
    }

    const nuevosTgiToInsert = [];
    const tgiToUpdate = [];

    for (const [key, val] of tgiMap.entries()) {
      const existenteId = tgiExistentesMap.get(key);
      if (!existenteId) {
        nuevosTgiToInsert.push(this.tgiRuralRepository.create(val.tgiData));
      } else {
        tgiToUpdate.push({
          id: existenteId,
          ...val.tgiData,
        });
      }
    }

    if (nuevosTgiToInsert.length > 0) {
      for (let i = 0; i < nuevosTgiToInsert.length; i += 500) {
        const chunk = nuevosTgiToInsert.slice(i, i + 500);
        const insertResult = await this.tgiRuralRepository.save(chunk);
        tgiAgregadosCount += insertResult.length;
        for (const t of insertResult) {
          tgiExistentesMap.set(normalizarEstricto(t.numero_padron), t.id);
        }
      }
    }

    if (tgiToUpdate.length > 0) {
      for (let i = 0; i < tgiToUpdate.length; i += 500) {
        const chunk = tgiToUpdate.slice(i, i + 500);
        await this.tgiRuralRepository.save(chunk);
      }
    }

    const involvedIds = Array.from(tgiMap.keys())
      .map((k) => tgiExistentesMap.get(k))
      .filter((id) => !!id);

    if (involvedIds.length > 0) {
      for (let i = 0; i < involvedIds.length; i += 500) {
        const chunk = involvedIds.slice(i, i + 500);
        await this.cuotaTgiRuralRepository.delete({ idTgiRural: In(chunk) });
      }
    }

    const cuotasToInsert = [];
    for (const [key, val] of tgiMap.entries()) {
      const tgiId = tgiExistentesMap.get(key);
      if (!tgiId) continue;
      for (const c of val.cuotas) {
        cuotasToInsert.push(
          this.cuotaTgiRuralRepository.create({ ...c, idTgiRural: tgiId }),
        );
      }
    }

    if (cuotasToInsert.length > 0) {
      for (let i = 0; i < cuotasToInsert.length; i += 500) {
        const chunk = cuotasToInsert.slice(i, i + 500);
        await this.cuotaTgiRuralRepository.save(chunk);
      }
    }

    return {
      tgiNuevos: tgiAgregadosCount,
      cuotasInsertadas: cuotasToInsert.length,
    };
  }
}
