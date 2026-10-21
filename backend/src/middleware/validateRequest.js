// Valida entradas no confiables antes de llegar a controladores y servicios.
export function validateRequest(schemas = {}) {
  return (req, res, next) => {
    const problems = [];

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        for (const issue of result.error.issues.slice(0, 5)) {
          const field = [source, ...issue.path].join('.');
          problems.push(`${field}: ${issue.message}`);
        }
      } else if (source === 'body' || source === 'params') {
        // Se usa el objeto validado; además, los esquemas estrictos rechazan campos extra.
        req[source] = result.data;
      }
    }

    if (problems.length) {
      return res.status(400).json({ error: `Datos inválidos: ${problems.join('; ')}` });
    }
    return next();
  };
}
