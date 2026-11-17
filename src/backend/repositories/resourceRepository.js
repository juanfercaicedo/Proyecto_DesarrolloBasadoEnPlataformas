export function createResourceRepository(delegate, idField) {
  return {
    list: () => delegate.findMany(),
    findById: (id) => delegate.findUnique({ where: { [idField]: Number(id) } }),
    create: (data) => delegate.create({ data }),
    update: (id, data) => delegate.update({ where: { [idField]: Number(id) }, data }),
    remove: (id) => delegate.delete({ where: { [idField]: Number(id) } }),
  };
}