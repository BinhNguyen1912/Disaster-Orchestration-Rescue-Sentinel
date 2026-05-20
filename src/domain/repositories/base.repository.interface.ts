export interface IBaseRepository<T> {
  findById(id: number | string): Promise<T | null>;

  findAll(options?: any): Promise<T[]>;

  create(data: Partial<T>): Promise<T>;

  createMany(data: Partial<T>[]): Promise<T[]>;

  update(id: number | string, data: Partial<T>): Promise<T | null>;

  delete(id: number | string): Promise<boolean>;

  findAndCount(options?: any): Promise<[T[], number]>;
}
