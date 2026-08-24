/**
 * Base for per-aggregate mappers that translate between plain domain entities
 * and Prisma row/input types. Mappers are infrastructure; they keep the domain
 * layer free of Prisma knowledge. One mapper per aggregate (UserMapper,
 * SessionMapper, ...) — added in later plans.
 */
export abstract class Mapper<Domain, Persistence> {
  abstract toPersistence(domain: Domain): Persistence;
  abstract toDomain(row: Persistence): Domain;
}
