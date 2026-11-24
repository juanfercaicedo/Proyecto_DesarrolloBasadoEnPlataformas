export function createResourceRepository(delegate, idField) {
  return {
    list: ({ skip, take }) => Promise.all([
      delegate.findMany({ skip, take, orderBy: { [idField]: "asc" } }),
      delegate.count(),
    ]),
    findById: (id) => delegate.findUnique({ where: { [idField]: Number(id) } }),
    create: (data) => delegate.create({ data }),
    update: (id, data) => delegate.update({ where: { [idField]: Number(id) }, data }),
    remove: (id) => delegate.delete({ where: { [idField]: Number(id) } }),
  };
}