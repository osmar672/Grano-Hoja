# Utilidades históricas de PostgreSQL

Los scripts de `postgres/` se conservan por trazabilidad de la etapa anterior. No forman parte del despliegue activo: el motor oficial de Grano & Hoja es MySQL 8/InnoDB, configurado por `compose.yaml`, `compose.production.yaml` y los esquemas SQL de la raíz. No ejecutes estas utilidades para instalaciones nuevas. Se mantienen aquí porque se comprobó que los procedimientos activos no las referencian.
