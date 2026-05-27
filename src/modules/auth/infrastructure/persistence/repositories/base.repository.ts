import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  ObjectLiteral,
} from 'typeorm';
import { IBaseRepository } from '@modules/auth/domain/repositories/base.repository.interface';

export abstract class BaseRepository<
  DomainEntity,
  OrmEntity extends ObjectLiteral,
> implements IBaseRepository<DomainEntity> {
  constructor(protected readonly repository: Repository<OrmEntity>) {}

  protected abstract toDomain(ormEntity: OrmEntity): DomainEntity;
  protected abstract toOrmEntity(
    domainEntity: Partial<DomainEntity>,
  ): DeepPartial<OrmEntity>;

  async findById(id: number | string): Promise<DomainEntity | null> {
    const options = { where: { id } } as unknown as FindOneOptions<OrmEntity>;
    const entity = await this.repository.findOne(options);
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: FindManyOptions<OrmEntity>): Promise<DomainEntity[]> {
    const entities = await this.repository.find(options);
    return entities.map((entity) => this.toDomain(entity));
  }

  async findAndCount(
    options?: FindManyOptions<OrmEntity>,
  ): Promise<[DomainEntity[], number]> {
    const [entities, count] = await this.repository.findAndCount(options);
    return [entities.map((entity) => this.toDomain(entity)), count];
  }

  async create(data: Partial<DomainEntity>): Promise<DomainEntity> {
    const ormEntityData = this.toOrmEntity(data);
    const createdEntity = this.repository.create(ormEntityData);
    const savedEntity = await this.repository.save(createdEntity);
    return this.toDomain(savedEntity);
  }

  async createMany(data: Partial<DomainEntity>[]): Promise<DomainEntity[]> {
    const ormEntitiesData = data.map((item) => this.toOrmEntity(item));
    const createdEntities = this.repository.create(ormEntitiesData);
    const savedEntities = await this.repository.save(createdEntities);
    return savedEntities.map((entity) => this.toDomain(entity));
  }

  async update(
    id: number | string,
    data: Partial<DomainEntity>,
  ): Promise<DomainEntity | null> {
    const options = { where: { id } } as unknown as FindOneOptions<OrmEntity>;
    const existingEntity = await this.repository.findOne(options);

    if (!existingEntity) {
      return null;
    }

    const cleanData: Partial<OrmEntity> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (cleanData as any)[key] = value;
      }
    }

    const updatedEntity = await this.repository.save({
      ...existingEntity,
      ...cleanData,
    });

    return this.toDomain(updatedEntity);
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
