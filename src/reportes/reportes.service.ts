import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Persona } from '../entities/persona.entity';
import { Patente } from '../entities/patente.entity';
import { TgiUrbano } from '../entities/tgi-urbano.entity';
import { TgiRural } from '../entities/tgi-rural.entity';
import { Gestion } from '../entities/gestion.entity';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
    @InjectRepository(Patente)
    private readonly patenteRepo: Repository<Patente>,
    @InjectRepository(TgiUrbano)
    private readonly tgiUrbanoRepo: Repository<TgiUrbano>,
    @InjectRepository(TgiRural)
    private readonly tgiRuralRepo: Repository<TgiRural>,
    @InjectRepository(Gestion)
    private readonly gestionRepo: Repository<Gestion>,
  ) {}

  async getDashboardData(idEntidad: number) {
    // 1. Fetch all products and their quotas for the entity
    const patentes = await this.patenteRepo.find({
      where: { persona: { idEntidad } },
      relations: ['persona', 'cuotas'],
    });

    const urbanos = await this.tgiUrbanoRepo.find({
      where: { persona: { idEntidad } },
      relations: ['persona', 'cuotas'],
    });

    const rurales = await this.tgiRuralRepo.find({
      where: { persona: { idEntidad } },
      relations: ['persona', 'cuotas'],
    });

    // Compute metrics
    let totalPatenteCapital = 0;
    let totalPatenteInteres = 0;
    let totalUrbanoCapital = 0;
    let totalUrbanoInteres = 0;
    let totalRuralCapital = 0;
    let totalRuralInteres = 0;

    const deudaPorPersonaMap = new Map<number, { persona: any, total: number, capital: number, interes: number }>();
    const itemsDetalle = [];

    const procesarCuotas = (item: any, tipo: string, capitalRef: {val: number}, interesRef: {val: number}) => {
      let itemCapital = 0;
      let itemInteres = 0;
      let cuotasAdeudadas = item.cuotas?.length || 0;

      item.cuotas?.forEach(c => {
        itemCapital += Number(c.capital || 0);
        itemInteres += Number(c.intereses || 0);
      });

      capitalRef.val += itemCapital;
      interesRef.val += itemInteres;

      const personaId = item.persona?.id;
      if (personaId) {
        if (!deudaPorPersonaMap.has(personaId)) {
          deudaPorPersonaMap.set(personaId, {
            persona: item.persona,
            total: 0,
            capital: 0,
            interes: 0
          });
        }
        const pd = deudaPorPersonaMap.get(personaId);
        pd.capital += itemCapital;
        pd.interes += itemInteres;
        pd.total += (itemCapital + itemInteres);
      }

      itemsDetalle.push({
        id: `${tipo}-${item.id}`,
        tipo,
        identificador: item.numero_patente || item.numero_padron,
        titular: item.persona?.apellidoNombre || `${item.persona?.apellido || ''}, ${item.persona?.nombre || ''}`,
        capital: itemCapital,
        interes: itemInteres,
        total: itemCapital + itemInteres,
        cuotasAdeudadas,
        ubicacion: item.domicilio,
        datoExtra: item.sup_terreno || item.sup_hectarea || item.marcaModelo || ''
      });
    };

    let pCap = {val: 0}; let pInt = {val: 0};
    patentes.forEach(p => procesarCuotas(p, 'Patente', pCap, pInt));
    totalPatenteCapital = pCap.val; totalPatenteInteres = pInt.val;

    let uCap = {val: 0}; let uInt = {val: 0};
    urbanos.forEach(u => procesarCuotas(u, 'TGI Urbano', uCap, uInt));
    totalUrbanoCapital = uCap.val; totalUrbanoInteres = uInt.val;

    let rCap = {val: 0}; let rInt = {val: 0};
    rurales.forEach(r => procesarCuotas(r, 'TGI Rural', rCap, rInt));
    totalRuralCapital = rCap.val; totalRuralInteres = rInt.val;

    // Consolidado
    const consolidado = [
      { producto: 'Patentes', capital: totalPatenteCapital, interes: totalPatenteInteres, total: totalPatenteCapital + totalPatenteInteres, cantidad: patentes.length },
      { producto: 'TGI Urbano', capital: totalUrbanoCapital, interes: totalUrbanoInteres, total: totalUrbanoCapital + totalUrbanoInteres, cantidad: urbanos.length },
      { producto: 'TGI Rural', capital: totalRuralCapital, interes: totalRuralInteres, total: totalRuralCapital + totalRuralInteres, cantidad: rurales.length }
    ];

    // Resumen (Top 100 deudores)
    const resumen = Array.from(deudaPorPersonaMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 100)
      .map(d => ({
        personaId: d.persona.id,
        nombre: d.persona.apellidoNombre || `${d.persona.apellido}, ${d.persona.nombre}`,
        cuit: d.persona.cuit || d.persona.nroDoc,
        capital: d.capital,
        interes: d.interes,
        total: d.total
      }));

    // Gestiones recentes para Operativo
    const gestiones = await this.gestionRepo.find({
      where: { persona: { idEntidad } },
      relations: ['persona'],
      order: { fecha_hora: 'DESC' },
      take: 20
    });

    const gestionesResumen = gestiones.map(g => ({
      id: g.id,
      accion: g.accion,
      contacto: g.contacto,
      fecha: g.fecha_hora,
      persona: g.persona?.apellidoNombre || `${g.persona?.apellido}, ${g.persona?.nombre}`
    }));

    return {
      consolidado,
      detalle: itemsDetalle,
      resumen,
      operativo: {
        totalProductos: patentes.length + urbanos.length + rurales.length,
        totalPersonasConDeuda: deudaPorPersonaMap.size,
        gestionesRecientes: gestionesResumen
      }
    };
  }
}
