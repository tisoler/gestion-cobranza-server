import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { ExtractJwt } from 'passport-jwt';
import * as admin from 'firebase-admin';
import { EntidadesService } from '../../entidades/entidades.service';
import serviceAccount from '../../../firebase-service-account.json';
import { Roles } from 'src/constantes';

// Inicializar la app si no ha sido inicializada
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: 'gestion-cobranza',
  });
}

export type UserGestionCobranza = {
  id: string;
  firebaseUid: string;
  nombreUsuario: string;
  email: string;
  idEntidad: number | undefined;
  nombreEntidad: string | null;
  idEntidades: number[];
  roles: string[];
  permisos: string[];
};

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase') {
  private userProfileCache = new Map<
    string,
    {
      userData: admin.firestore.DocumentData;
      roles: string[];
      permisos: string[];
      authTime: number;
    }
  >();

  constructor(private entidadesService: EntidadesService) {
    super();
  }

  async validate(req: any): Promise<UserGestionCobranza> {
    const fn = ExtractJwt.fromAuthHeaderAsBearerToken();
    const token = fn(req);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      const uid = decodedUser.uid;

      const db = admin.firestore();
      let userData: admin.firestore.DocumentData | undefined;
      let roles: string[] = [];
      let permisos: string[] = [];

      const cachedProfile = this.userProfileCache.get(uid);
      const tokenAuthTime = decodedUser.auth_time;

      if (cachedProfile && cachedProfile.authTime === tokenAuthTime) {
        userData = cachedProfile.userData;
        roles = cachedProfile.roles;
        permisos = cachedProfile.permisos;
      } else {
        const userDoc = await db.collection('usuarios').doc(uid).get();

        if (!userDoc.exists) {
          throw new UnauthorizedException(
            'Usuario no configurado en el sistema',
          );
        }

        userData = userDoc.data()!;
        const rolId = userData.idRol as string | undefined;

        if (rolId) {
          const roleDoc = await db.collection('roles').doc(rolId).get();
          const roleData = roleDoc.data();

          if (
            roleData?.permisos &&
            (roleData.permisos as string[]).length > 0
          ) {
            const permisosDoc = await db
              .collection('permisos')
              .where(
                admin.firestore.FieldPath.documentId(),
                'in',
                roleData.permisos,
              )
              .get();
            permisos =
              permisosDoc.docs?.map(
                (doc) => (doc.data().nombre || doc.data().id) as string,
              ) || [];
          }
          roles = roleData?.nombre ? [roleData.nombre as string] : [];
        }

        this.userProfileCache.set(uid, {
          userData,
          roles,
          permisos,
          authTime: tokenAuthTime,
        });
      }

      const idEntidad =
        userData?.idEntidad ||
        (userData?.idEntidades?.length && userData?.idEntidades?.[0]);

      const entidad =
        idEntidad && !isNaN(Number(idEntidad))
          ? await this.entidadesService.findOne(Number(idEntidad))
          : null;

      const isSysAdmin = roles.includes(Roles.SYS_ADMIN);
      const rawHeader = req.headers['x-entidad-id'] as string | undefined;
      const requestedHeader = Array.isArray(rawHeader)
        ? (rawHeader[0] as string)
        : rawHeader;
      const requestedId =
        requestedHeader != null && requestedHeader !== ''
          ? parseInt(String(requestedHeader), 10)
          : NaN;

      const allowedEntidadIds: number[] = Array.isArray(userData?.idEntidades)
        ? userData.idEntidades
            .map((x: unknown) => Number(x))
            .filter((n) => Number.isFinite(n))
        : [];
      if (userData?.idEntidad != null) {
        const n = Number(userData.idEntidad);
        if (Number.isFinite(n) && !allowedEntidadIds.includes(n)) {
          allowedEntidadIds.push(n);
        }
      }

      let finalIdEntidad: number | undefined =
        idEntidad != null && Number.isFinite(Number(idEntidad))
          ? Number(idEntidad)
          : undefined;
      let finalNombreEntidad = entidad?.nombre || null;

      if (Number.isFinite(requestedId)) {
        if (isSysAdmin) {
          const reqEntidad = await this.entidadesService.findOne(requestedId);
          if (reqEntidad?.activo) {
            finalIdEntidad = requestedId;
            finalNombreEntidad = reqEntidad.nombre;
          }
        } else if (allowedEntidadIds.includes(requestedId)) {
          finalIdEntidad = requestedId;
          const reqEntidad = await this.entidadesService.findOne(requestedId);
          finalNombreEntidad = reqEntidad?.nombre || null;
        }
      }

      return {
        id: uid,
        firebaseUid: uid,
        nombreUsuario: decodedUser.email,
        email: decodedUser.email,
        idEntidad: finalIdEntidad,
        nombreEntidad: finalNombreEntidad,
        idEntidades: (userData?.idEntidades as number[]) || [],
        roles: roles,
        permisos: permisos,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      console.error('Error en FirebaseStrategy:', e);
      throw new UnauthorizedException('Error al validar token de Firebase');
    }
  }
}
