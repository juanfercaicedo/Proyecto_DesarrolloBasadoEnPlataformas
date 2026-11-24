import { createResourceService } from "../services/resourceService.js";

export function createResourceController(model) {
  const service = createResourceService(model);
  const serialize = (record) => {
    const data = record?.toJSON?.() ?? { ...record };
    if (data && typeof data === "object") delete data.contrasena_hash;
    return data;
  };
  return {
    list: async (_request, response, next) => {
      try { response.json({ data: (await service.list()).map(serialize) }); } catch (error) { next(error); }
    },
    get: async (request, response, next) => {
      try { response.json({ data: serialize(await service.get(request.params.id)) }); } catch (error) { next(error); }
    },
    create: async (request, response, next) => {
      try { response.status(201).json({ data: serialize(await service.create(request.body, { requirePassword: true })) }); } catch (error) { next(error); }
    },
    update: async (request, response, next) => {
      try { response.json({ data: serialize(await service.update(request.params.id, request.body)) }); } catch (error) { next(error); }
    },
    remove: async (request, response, next) => {
      try { await service.remove(request.params.id); response.status(204).end(); } catch (error) { next(error); }
    },
  };
}