import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

export type UsuarioEntidadDto = {
  uid: string;
  email: string;
  nombre: string;
};

@Injectable()
export class UsuariosService {
  private get db() {
    return admin.firestore();
  }

  /**
   * Usuarios de Firestore (`usuarios`) asignados a la entidad vía `idEntidades`
   * (o `idEntidad` legacy). El nombre visible viene del campo `nombre` del documento.
   */
  async findByEntidad(idEntidad: number): Promise<UsuarioEntidadDto[]> {
    const [byEntidadesStr] = await Promise.all([
      this.db
        .collection('usuarios')
        .where('idEntidades', 'array-contains', String(idEntidad))
        .get(),
    ]);

    const map = new Map<string, admin.firestore.DocumentData>();
    for (const snap of [byEntidadesStr]) {
      for (const doc of snap.docs) {
        map.set(doc.id, doc.data());
      }
    }

    const usuarios: UsuarioEntidadDto[] = [];
    for (const [uid, data] of map) {
      const nombre = this.extraerNombre(data);
      const email = await this.extraerEmail(uid, data);
      if (!nombre && !email) continue;

      usuarios.push({
        uid,
        email,
        nombre: nombre || email,
      });
    }

    return usuarios.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    );
  }

  async belongsToEntidad(uid: string, idEntidad: number): Promise<boolean> {
    const doc = await this.db.collection('usuarios').doc(uid).get();
    if (!doc.exists) return false;
    return this.usuarioTieneEntidad(doc.data(), idEntidad);
  }

  private usuarioTieneEntidad(
    data: admin.firestore.DocumentData,
    idEntidad: number,
  ): boolean {
    if (Number(data.idEntidad) === idEntidad) return true;
    const ids = this.normalizarIdEntidades(data.idEntidades);
    if (ids.includes(idEntidad)) return true;
    const idsStr = (data.idEntidades as unknown[] | undefined)?.map((id) =>
      String(id as number).trim(),
    );
    return idsStr?.includes(String(idEntidad)) ?? false;
  }

  private normalizarIdEntidades(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  }

  private extraerNombre(data: admin.firestore.DocumentData): string {
    const nombre = (data.nombre as string)?.trim();
    if (nombre) return nombre;
    return (data.displayName as string)?.trim() || '';
  }

  private async extraerEmail(
    uid: string,
    data: admin.firestore.DocumentData,
  ): Promise<string> {
    const email =
      (data.email as string)?.trim() ||
      (data.nombreUsuario as string)?.trim() ||
      '';
    if (email) return email;
    return (await this.resolveEmail(uid)) || '';
  }

  private async resolveEmail(uid: string): Promise<string | null> {
    try {
      const user = await admin.auth().getUser(uid);
      return user.email?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
