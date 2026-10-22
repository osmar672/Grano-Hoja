import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agentBodySchema, idParamsSchema, loginBodySchema, orderCreateBodySchema,
  productCreateBodySchema, productListQuerySchema, productPatchBodySchema, summaryQuerySchema, googleStartQuerySchema,
  insumoCreateBodySchema, insumoPatchBodySchema, insumoListQuerySchema, recetaReplaceBodySchema,
  adminUserCreateBodySchema, adminUserPatchBodySchema, adminUsersQuerySchema,
} from '../src/validation/schemas.js';
import { requireRole } from '../src/middleware/requireRole.js';

const validProduct={nombre:'Espresso de prueba',descripcion:'Café preparado al momento',precio:1500,categoria:'bebidas_calientes',stock:0,stock_minimo:0,activo:true};
test('producto válido de cafetería acepta los campos comerciales y de inventario',()=>assert.equal(productCreateBodySchema.safeParse(validProduct).success,true));
test('rechaza HTML en nombre y descripción del producto',()=>{assert.equal(productCreateBodySchema.safeParse({...validProduct,nombre:'<script>x</script>'}).success,false);assert.equal(productCreateBodySchema.safeParse({...validProduct,descripcion:'<img src=x>'}).success,false);});
test('rechaza campos inesperados para evitar mass assignment',()=>assert.equal(productCreateBodySchema.safeParse({...validProduct,role:'admin',id:99}).success,false));
test('permite texto con comillas SQL en búsqueda porque los servicios parametrizan SQL',()=>assert.equal(productListQuerySchema.safeParse({q:"' OR 1=1 --"}).success,true));
test('rechaza categoría desconocida, stock negativo o stock decimal',()=>{assert.equal(productCreateBodySchema.safeParse({...validProduct,categoria:'muebles-antiguos'}).success,false);assert.equal(productCreateBodySchema.safeParse({...validProduct,stock:-1}).success,false);assert.equal(productCreateBodySchema.safeParse({...validProduct,stock:1.5}).success,false);});
test('PATCH de producto acepta un campo válido, rechaza {}, campos extra y valores inválidos',()=>{assert.equal(productPatchBodySchema.safeParse({precio:1500}).success,true);assert.equal(productPatchBodySchema.safeParse({nombre:'Latte'}).success,true);assert.equal(productPatchBodySchema.safeParse({}).success,false);assert.equal(productPatchBodySchema.safeParse({admin:true}).success,false);assert.equal(productPatchBodySchema.safeParse({precio:-1}).success,false);});

test('insumo admite stock decimal en unidad de medida',()=>assert.equal(insumoCreateBodySchema.safeParse({nombre:'Café en grano',unidad:'g',stock:125.5,stock_minimo:20}).success,true));
test('insumo rechaza stock negativo y más de tres decimales',()=>{assert.equal(insumoCreateBodySchema.safeParse({nombre:'Leche',unidad:'ml',stock:-1,stock_minimo:0}).success,false);assert.equal(insumoCreateBodySchema.safeParse({nombre:'Leche',unidad:'ml',stock:1.2345,stock_minimo:0}).success,false);});
test('PATCH de insumo exige al menos un campo válido',()=>{assert.equal(insumoPatchBodySchema.safeParse({}).success,false);assert.equal(insumoPatchBodySchema.safeParse({stock:2.5}).success,true);assert.equal(insumoPatchBodySchema.safeParse({stock:-1}).success,false);});
test('filtros de insumos aceptan filtros de la página',()=>assert.equal(insumoListQuerySchema.safeParse({q:'café',bajo_minimo:'false',orden:'stock_minimo'}).success,true));
test('receta acepta cantidades positivas y rechaza duplicados o cero',()=>{assert.equal(recetaReplaceBodySchema.safeParse({items:[{insumo_id:1,cantidad:18},{insumo_id:2,cantidad:100.25}]}).success,true);assert.equal(recetaReplaceBodySchema.safeParse({items:[{insumo_id:1,cantidad:18},{insumo_id:1,cantidad:20}]}).success,false);assert.equal(recetaReplaceBodySchema.safeParse({items:[{insumo_id:1,cantidad:0}]}).success,false);assert.equal(recetaReplaceBodySchema.safeParse({items:[]}).success,true);});
test('pedido rechaza método de pago inválido y cantidades no enteras',()=>{assert.equal(orderCreateBodySchema.safeParse({metodo_pago:'crypto',items:[{producto_id:1,cantidad:1}]}).success,false);assert.equal(orderCreateBodySchema.safeParse({metodo_pago:'efectivo',items:[{producto_id:1,cantidad:1.5}]}).success,false);});
test('rechaza IDs inválidos y fechas inexistentes',()=>{assert.equal(idParamsSchema.safeParse({id:'1;DROP'}).success,false);assert.equal(summaryQuerySchema.safeParse({fecha:'2026-02-31'}).success,false);});
test('login valida correo y limita bytes de contraseña para bcrypt',()=>{assert.equal(loginBodySchema.safeParse({email:'no-es-correo',password:'Password123456'}).success,false);assert.equal(loginBodySchema.safeParse({email:'admin@granoyhoja.local',password:'a'.repeat(73)}).success,false);});
test('requireRole rechaza rol sin permiso con HTTP 403',()=>{let status=0;let payload;let nextCalled=false;const req={user:{id:3,role:'caja'}};const res={status(code){status=code;return this;},json(body){payload=body;return this;}};requireRole('admin')(req,res,()=>{nextCalled=true;});assert.equal(status,403);assert.deepEqual(payload,{error:'No tienes permisos para realizar esta operación'});assert.equal(nextCalled,false);});
test('un rol autorizado pasa al controlador',()=>{let nextCalled=false;const req={user:{id:2,role:'encargado'}};const res={status(){throw new Error('No se esperaba respuesta HTTP');},json(){throw new Error('No se esperaba respuesta HTTP');}};requireRole('admin','encargado')(req,res,()=>{nextCalled=true;});assert.equal(nextCalled,true);});
test('token de servicio solo funciona en middleware específico y se compara de forma segura',async()=>{const old=process.env.N8N_API_SERVICE_TOKEN;const token='r'.repeat(48);process.env.N8N_API_SERVICE_TOKEN=token;try{const {requireRoleOrServiceToken}=await import('../src/middleware/requireRole.js');let nextCalled=false;const req={get:(name)=>name.toLowerCase()==='x-service-token'?token:''};const res={status(){throw new Error('No se esperaba error');},json(){throw new Error('No se esperaba error');}};requireRoleOrServiceToken('admin','encargado')(req,res,()=>{nextCalled=true;});assert.equal(req.serviceAuth,true);assert.equal(nextCalled,true);}finally{if(old===undefined)delete process.env.N8N_API_SERVICE_TOKEN;else process.env.N8N_API_SERVICE_TOKEN=old;}});
test('solicitud del agente limita longitud y rechaza marcado HTML',()=>{assert.equal(agentBodySchema.safeParse({solicitud:'Sugiere reposición a partir de ventas semanales'}).success,true);assert.equal(agentBodySchema.safeParse({solicitud:'<script>alert(1)</script>'}).success,false);assert.equal(agentBodySchema.safeParse({solicitud:'x'.repeat(1001)}).success,false);assert.equal(agentBodySchema.safeParse({solicitud:'analiza',role:'admin'}).success,false);});

test('inicio y registro Google solo aceptan intenciones permitidas',()=>{assert.equal(googleStartQuerySchema.safeParse({intent:'login'}).success,true);assert.equal(googleStartQuerySchema.safeParse({intent:'register'}).success,true);assert.equal(googleStartQuerySchema.safeParse({intent:'admin'}).success,false);assert.equal(googleStartQuerySchema.safeParse({intent:'register',role:'admin'}).success,false);});


test('administración exige contraseña fuerte y rol permitido al crear usuario', () => {
  const valid = { email: 'PERSONA@example.com', displayName: 'Persona Nueva', password: 'CafeFuerte2026', role: 'caja' };
  const parsed = adminUserCreateBodySchema.safeParse(valid);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.email, 'persona@example.com');
  assert.equal(adminUserCreateBodySchema.safeParse({ ...valid, role: 'superadmin' }).success, false);
  assert.equal(adminUserCreateBodySchema.safeParse({ ...valid, password: 'weak' }).success, false);
  assert.equal(adminUserCreateBodySchema.safeParse({ ...valid, extra: 'admin' }).success, false);
});

test('PATCH de usuario exige al menos un campo y limita roles', () => {
  assert.equal(adminUserPatchBodySchema.safeParse({ active: false }).success, true);
  assert.equal(adminUserPatchBodySchema.safeParse({ role: 'encargado' }).success, true);
  assert.equal(adminUserPatchBodySchema.safeParse({}).success, false);
  assert.equal(adminUserPatchBodySchema.safeParse({ role: 'root' }).success, false);
  assert.equal(adminUserPatchBodySchema.safeParse({ active: true, admin: true }).success, false);
});

test('filtros del panel de administración limitan la consulta y la cantidad de eventos', () => {
  assert.equal(adminUsersQuerySchema.safeParse({ q: 'Café', role: 'admin', status: 'active', limit: '50' }).success, true);
  assert.equal(adminUsersQuerySchema.safeParse({ limit: '1000' }).success, false);
  assert.equal(adminUsersQuerySchema.safeParse({ sort: 'DROP TABLE' }).success, false);
});
