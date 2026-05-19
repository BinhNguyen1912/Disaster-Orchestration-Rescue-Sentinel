import { Repository, FindManyOptions, FindOneOptions, DeepPartial, ObjectLiteral } from 'typeorm';
import { IBaseRepository } from '@domain/repositories/base.repository.interface';

export abstract class BaseRepository<DomainEntity, OrmEntity extends ObjectLiteral> implements IBaseRepository<DomainEntity> {
  //DomainEntity: Là thực thể thuần túy chứa logic nghiệp vụ, không phụ thuộc vào framework
  //OrmEntity: Là các Class map trực tiếp với các bảng trong Database của TypeORM
  constructor(protected readonly repository: Repository<OrmEntity>) { }

  /**
   * Mỗi DB Entity chưa chắc đã giống 100% với Domain Entity. Vì vậy, class này định nghĩa 2 phương thức trừu tượng (abstract):
   * toDomain(ormEntity): Chuyển đổi dữ liệu lấy từ DB lên thành thực thể Domain để ứng dụng xử lý.
   * toOrmEntity(domainEntity): Chuyển đổi dữ liệu từ Domain xuống định dạng mà TypeORM có thể hiểu để lưu vào DB.
   */
  protected abstract toDomain(ormEntity: OrmEntity): DomainEntity;
  protected abstract toOrmEntity(domainEntity: Partial<DomainEntity>): DeepPartial<OrmEntity>;

  async findById(id: number | string): Promise<DomainEntity | null> {
    const options = { where: { id } } as unknown as FindOneOptions<OrmEntity>;
    const entity = await this.repository.findOne(options);
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: FindManyOptions<OrmEntity>): Promise<DomainEntity[]> {
    const entities = await this.repository.find(options);
    return entities.map((entity) => this.toDomain(entity));
  }

  async findAndCount(options?: FindManyOptions<OrmEntity>): Promise<[DomainEntity[], number]> {
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

  async update(id: number | string, data: Partial<DomainEntity>): Promise<DomainEntity | null> {
    const options = { where: { id } } as unknown as FindOneOptions<OrmEntity>;
    const existingEntity = await this.repository.findOne(options);

    if (!existingEntity) {
      return null;
    }

    const ormDataToUpdate = this.toOrmEntity(data);
    const updatedEntity = await this.repository.save({
      ...existingEntity,
      ...ormDataToUpdate,
    });

    return this.toDomain(updatedEntity);
  }

  async delete(id: number | string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
