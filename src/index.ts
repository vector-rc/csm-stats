import "reflect-metadata"
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { aclDataSource, getDatasource } from './datasources';
import { AclCompany } from './acl-company/acl-company.entity';
import { ComCompanies } from './csm-company/csm-company.entity';
import { ComEmployee } from './csm-employee/csm-employee.entity';
import { ComSubsidiaries } from './csm-subsidiary/csm-subsidiary.entity';
import { WarWarehouses } from './csm-warehouse/csm-warehouse.entity';
import { ComDelivery } from './csm-delivery/csm-delivery.entity';
import { AbstractSale } from "./abstract-sale/sale-abstract.entity"
import { Between, Equal, In, IsNull, Not } from "typeorm"
import { PurDocuments } from "./csm-purchase/csm-purchase.entity"
import { updateAbstractSales } from "./update-abstract-sales"
import { AclTemplate } from "./acl-template/acl-template.entity";
import { SalTerminal } from "./csm-terminal/csm-terminal.entity";
import { WarWarehousesProducts } from "./csm-warehouse/csm-warehouse-product.entity";
import { WarProduct } from "./csm-product/war-product.entity";

process.env.TZ = "UTC";
const app = new Hono()

app.use('/*', cors())
app.use(logger())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

function generateRandomDate(startDate: Date, endDate: Date) {
  // Convert the start and end dates to their millisecond timestamps.
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();

  // Generate a random timestamp within the range.
  // Math.random() returns a float between 0 (inclusive) and 1 (exclusive).
  const randomTimestamp = startTimestamp + Math.random() * (endTimestamp - startTimestamp);

  // Create a new Date object from the random timestamp.
  return new Date(randomTimestamp);
}


function getMonthUnixRange(date: Date): { start: number; end: number } {
  // Inicio del mes
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

  // Fin del mes (día 0 del siguiente mes es el último día del mes actual)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

function getMonthName(date: Date, locale: string = "es-ES"): string {
  return date.toLocaleString(locale, { month: "long" });
}


app.get('abstract/acl-code/:aclCode', async (c) => {

  const aclCompanyRepo = aclDataSource.getRepository(AclCompany)
  const aclTemplateRepo = aclDataSource.getRepository(AclTemplate)
  const aclCompany = await aclCompanyRepo.findOneBy({ codeCompany: c.req.param().aclCode })
  if (!aclCompany) {
    return c.json({ error: 'ACL Company not found' }, 404)
  }

  const aclTemplate = await aclTemplateRepo.findOneBy({ id: aclCompany?.templateId })

  // console.log('ACL TEMPLATE SETTINGS',aclTemplate?.settings)
  const nodeName = aclTemplate?.settings.domains.find((d: any) => d.code === 'PRODUCTS_URL').endPoint.replace('https://', '').split('.')[0]
  const datasource = getDatasource(nodeName)

  const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
  const csmCompany = await csmCompanyRepo.findOneBy({ aclId: aclCompany?.id })

  const csmEmployeesRepo = datasource.sales.getRepository(ComEmployee)
  const employeesCount = await csmEmployeesRepo.countBy({ companyId: csmCompany?.id })
  const sellersCount = await csmEmployeesRepo.countBy({ companyId: csmCompany?.id })

  const csmDeliveriesRepo = datasource.sales.getRepository(ComDelivery)
  const deliveriesCount = await csmDeliveriesRepo.countBy({ companyId: csmCompany?.id })

  const csmSubsidiariesRepo = datasource.sales.getRepository(ComSubsidiaries)
  const subsidiariesCount = await csmSubsidiariesRepo.countBy({ companyId: csmCompany?.id })

  const csmWarehousesRepo = datasource.products.getRepository(WarWarehouses)
  const warehousesCount = await csmWarehousesRepo.countBy({ companyId: csmCompany?.id })

  const csmTerminalRepo = datasource.sales.getRepository(SalTerminal)
  const terminalCount = await csmTerminalRepo.countBy({ companyId: csmCompany?.id })

  const csmProductsRepo = datasource.products.getRepository(WarProduct)
  const skusCount = await csmProductsRepo.countBy({ companyId: csmCompany?.id })

  const csmPurchasesRepo = datasource.sales.getRepository(PurDocuments)
  const abstractSaleRepo = datasource.sales.getRepository(AbstractSale)

  const firstSale = await abstractSaleRepo.findOne({ where: { aclId: aclCompany?.id, createdAt: Not(Equal(0)) }, order: { createdAt: 'ASC' } })
  const lastSale = await abstractSaleRepo.findOne({ where: { aclId: aclCompany?.id, createdAt: Not(Equal(0)) }, order: { createdAt: 'DESC' } })
  const lastPurchase = await csmPurchasesRepo.findOne({ where: { companyId: csmCompany?.id, deletedAt: IsNull() }, order: { createdAt: 'DESC' } })
  const today = new Date()

  const dateMonth1 = new Date(today.getFullYear(), today.getMonth() - 1, 2);
  const dateMonth1Range = getMonthUnixRange(dateMonth1);
  const salesMonth1 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, createdAt: Between(dateMonth1Range.start, dateMonth1Range.end) }, select: { id: true, amount: true } })
  const purchasesMonth1 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth1Range.start, dateMonth1Range.end), deletedAt: IsNull() }, select: { id: true, amount: true } })


  const dateMonth2 = new Date(today.getFullYear(), today.getMonth() - 2, 2);
  const dateMonth2Range = getMonthUnixRange(dateMonth2);
  const salesMonth2 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, createdAt: Between(dateMonth2Range.start, dateMonth2Range.end) }, select: { id: true, amount: true } })
  const purchasesMonth2 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth2Range.start, dateMonth2Range.end), deletedAt: IsNull() }, select: { id: true, amount: true } })


  const dateMonth3 = new Date(today.getFullYear(), today.getMonth() - 3, 2);
  const dateMonth3Range = getMonthUnixRange(dateMonth3);
  const salesMonth3 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, createdAt: Between(dateMonth3Range.start, dateMonth3Range.end) }, select: { id: true, amount: true } })
  const purchasesMonth3 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth3Range.start, dateMonth3Range.end), deletedAt: IsNull() }, select: { id: true, amount: true } })

  return c.json({
    csm_node: nodeName,
    acl_id: aclCompany?.id,
    acl_code: aclCompany?.codeCompany,
    company_id: csmCompany?.id,
    first_sale_date: firstSale?.createdAt ? new Date(firstSale?.createdAt) : null,
    last_sale_date: lastSale?.createdAt ? new Date(lastSale?.createdAt) : null,
    last_purchase_date: lastPurchase?.dateDocument ?? null,
    last_three_months: [
      { month_name: getMonthName(dateMonth1), month_number: dateMonth1.getMonth() + 1, sales_count: salesMonth1.length, sales_amount: salesMonth1.reduce((acc: number, c: AbstractSale) => (acc + c.amount), 0), purchases_count: purchasesMonth1.length, purchases_amount: purchasesMonth1.reduce((acc: number, c: PurDocuments) => (acc + Number(c.amount ?? 0)), 0) },
      { month_name: getMonthName(dateMonth2), month_number: dateMonth2.getMonth() + 1, sales_count: salesMonth2.length, sales_amount: salesMonth2.reduce((acc: number, c: AbstractSale) => (acc + c.amount), 0), purchases_count: purchasesMonth2.length, purchases_amount: purchasesMonth2.reduce((acc: number, c: PurDocuments) => (acc + Number(c.amount ?? 0)), 0) },
      { month_name: getMonthName(dateMonth3), month_number: dateMonth3.getMonth() + 1, sales_count: salesMonth3.length, sales_amount: salesMonth3.reduce((acc: number, c: AbstractSale) => (acc + c.amount), 0), purchases_count: purchasesMonth3.length, purchases_amount: purchasesMonth3.reduce((acc: number, c: PurDocuments) => (acc + Number(c.amount ?? 0)), 0) },
    ],
    employees_count: employeesCount,
    warehouses_count: warehousesCount,
    subsidiaries_count: subsidiariesCount,
    deliveries_count: deliveriesCount,
    sellers_count: sellersCount,
    terminals_count: terminalCount,
    skus_count: skusCount
  })
})

app.get('abstract-company/acl-code/:aclCode', async (c) => {

  const aclCompanyRepo = aclDataSource.getRepository(AclCompany)
  const aclTemplateRepo = aclDataSource.getRepository(AclTemplate)
  const aclCompany = await aclCompanyRepo.findOneBy({ codeCompany: c.req.param().aclCode })
  if (!aclCompany) {
    return c.json({ error: 'ACL Company not found' }, 404)
  }

  const aclTemplate = await aclTemplateRepo.findOneBy({ id: aclCompany?.templateId })

  // console.log('ACL TEMPLATE SETTINGS',aclTemplate?.settings)
  const nodeName = aclTemplate?.settings.domains.find((d: any) => d.code === 'PRODUCTS_URL').endPoint.replace('https://', '').split('.')[0]
  const datasource = getDatasource(nodeName)

  const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
  const csmCompany = await csmCompanyRepo.findOneBy({ aclId: aclCompany?.id })

  return c.json({
    csm_node: nodeName,
    acl_id: aclCompany?.id,
    acl_code: aclCompany?.codeCompany,
    company_id: csmCompany?.id,
    company_ruc: aclCompany?.ruc,
    company_name: aclCompany?.nombreComercial,
  })
})

app.get('abstract-sales/acl-code/:aclCode', async (c) => {

  const aclCode = c.req.param().aclCode
  const aclCompanyRepo = aclDataSource.getRepository(AclCompany)
  const aclTemplateRepo = aclDataSource.getRepository(AclTemplate)
  const aclCompany = await aclCompanyRepo.findOneBy({ codeCompany: aclCode })
  if (!aclCompany) {
    return c.json({ error: 'ACL Company not found' }, 404)
  }

  const aclTemplate = await aclTemplateRepo.findOneBy({ id: aclCompany?.templateId })

  // console.log('ACL TEMPLATE SETTINGS',aclTemplate?.settings)
  const nodeName = aclTemplate?.settings.domains.find((d: any) => d.code === 'PRODUCTS_URL').endPoint.replace('https://', '').split('.')[0]
  console.log(`ACL CODE ${aclCode}, NODE NAME ${nodeName}`)
  const datasource = getDatasource(nodeName)

  const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
  const csmCompany = await csmCompanyRepo.findOneBy({ aclId: aclCompany?.id })

  const csmWarehousesRepo = datasource.products.getRepository(WarWarehouses)
  const csmTerminalRepo = datasource.sales.getRepository(SalTerminal)
  const warehouses = await csmWarehousesRepo.find({ where: { companyId: csmCompany?.id }, select: { id: true, name: true } })
  const warehouseIdMap: Map<number, WarWarehouses> = new Map(warehouses.map(w => [w.id, w]))
  const terminals = await csmTerminalRepo.find({ where: { companyId: csmCompany?.id }, select: { id: true, name: true, warWarehousesId: true } })
  const terminalIdMap: Map<number, SalTerminal> = new Map(terminals.map(t => [t.id, t]))

  const abstractSaleRepo = datasource.sales.getRepository(AbstractSale)
  const sales = await abstractSaleRepo.find({
    where: { aclId: aclCompany?.id },
    select: {
      saleId: true,
      amount: true,
      terminalId: true,
      warehouseId: true
    }
  })

  console.log(`Found ${sales.length} sales for company ${aclCode}`)

  const warehouseSales: Map<number, { id: number, name: string, salesCount: number, salesMount: number, productsCount: number }> = new Map()
  const terminalSales: Map<number, { id: number, name: string, warehouseId: number, warehouseName: string, salesCount: number, salesMount: number }> = new Map()

  sales.forEach(s => {

    if (!s.warehouseId) return

    const warehouse = warehouseIdMap.get(s.warehouseId)
    if (!warehouse) return

    const ws = warehouseSales.get(s.warehouseId)

    if (ws) {
      ws.salesCount = ws.salesCount + 1
      ws.salesMount = ws.salesMount + (Number(s.amount) ? Number(s.amount) : 0)
      warehouseSales.set(s.warehouseId, ws)
    } else {
      warehouseSales.set(s.warehouseId, { id: warehouse.id, name: warehouse.name, salesCount: 1, salesMount: Number(s.amount) ? Number(s.amount) : 0, productsCount: 0 })
    }


    if (s.terminalId) {
      const ts = terminalSales.get(s.terminalId)
      const terminal = terminalIdMap.get(s.terminalId)
      if (!terminal) return
      const warehouse = warehouseIdMap.get(terminal.warWarehousesId ?? 0)
      if (!warehouse) return
      if (ts) {
        ts.salesCount = ts.salesCount + 1
        ts.salesMount = ts.salesMount + (Number(s.amount) ? Number(s.amount) : 0)
        terminalSales.set(s.terminalId, ts)
      } else {
        terminalSales.set(s.terminalId, { id: terminal.id, name: terminal.name ?? '', warehouseId: warehouse.id, warehouseName: warehouse.name, salesCount: 1, salesMount: Number(s.amount) ? Number(s.amount) : 0 })
      }
    }

  })


  const csmWarehouseProductsRepo = datasource.products.getRepository(WarWarehousesProducts)
  const warehouseProducts = await csmWarehouseProductsRepo.find({ where: { warehouseId: In(warehouses.map(w => w.id)) }, select: { warehouseId: true, productId: true, stock: true } })

  warehouseProducts.forEach(wp => {
    const current = warehouseSales.get(wp.warehouseId)
    const warehouse = warehouseIdMap.get(wp.warehouseId ?? 0)
    if (!warehouse) return
    if (current) {
      current.productsCount = (current.productsCount ?? 0) + 1
      warehouseSales.set(wp.warehouseId, current)
    } else {
      warehouseSales.set(wp.warehouseId, { id: warehouse.id, name: warehouse.name, salesCount: 0, salesMount: 0, productsCount: 1 })

    }
  })

  return c.json({
    csmNode: nodeName,
    aclId: aclCompany?.id,
    aclCode: aclCompany?.codeCompany,
    company_id: csmCompany?.id,
    companyRuc: aclCompany?.ruc,
    companyName: aclCompany?.nombreComercial,
    warehouses: Array.from(warehouseSales.values()),
    terminals: Array.from(terminalSales.values()),
  })
})

const csmNodeTerminals: Record<string, any> = {

}
const csmNodeWarehouses: Record<string, any> = {

}

async function getDataTerminal(csmNode: string) {

  csmNodeTerminals[csmNode] = {
    status: 'processing',
    startedAt: new Date(),
    finishedAt: null,
  }
  try {

    console.log(` NODE NAME ${csmNode}`)
    const datasource = getDatasource(csmNode)
    const saleLast = await datasource.sales.getRepository(AbstractSale).findOne({ where: {}, select: { id: true }, order: { id: 'DESC' } })
    const saleFirst = await datasource.sales.getRepository(AbstractSale).findOne({ where: {}, select: { id: true }, order: { id: 'ASC' } })

    const chunksSize = 50000

    const abstractSaleRepo = datasource.sales.getRepository(AbstractSale)
    const terminalSales: Map<number, { aclId: number, terminalId: number, warehouseId: number, salesCount: number, salesMount: number }> = new Map()

    for (let i = saleFirst?.id ?? 0; i <= (saleLast?.id ?? 0); i = i + chunksSize) {
      console.log(`Processing sales from ${i} to ${i + chunksSize}`)
      const sales = await abstractSaleRepo.find({
        where: { id: Between(i, i + chunksSize) },
        select: {
          saleId: true,
          amount: true,
          terminalId: true,
          warehouseId: true
        }
      })

      console.log(`Found ${sales.length} sales for node ${csmNode}`)
      sales.forEach(s => {

        if (!s.warehouseId) return


        if (!s.terminalId) return
        const ts = terminalSales.get(s.terminalId)
        if (ts) {
          ts.salesCount = ts.salesCount + 1
          ts.salesMount = ts.salesMount + (Number(s.amount) ? Number(s.amount) : 0)
          terminalSales.set(s.terminalId, ts)
        } else {
          terminalSales.set(s.terminalId, { aclId: s.aclId, terminalId: s.terminalId, warehouseId: s.warehouseId, salesCount: 1, salesMount: Number(s.amount) ? Number(s.amount) : 0 })
        }


      })
    }

    const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
    const csmWarehousesRepo = datasource.products.getRepository(WarWarehouses)
    const csmTerminalRepo = datasource.sales.getRepository(SalTerminal)

    const warehousesIds = Array.from(new Set(Array.from(terminalSales.values()).map(ts => ts.warehouseId)))
    const terminalIds = Array.from(new Set(Array.from(terminalSales.values()).map(ts => ts.terminalId)))

    const warehouses = await csmWarehousesRepo.find({ where: { id: In(warehousesIds) }, select: { id: true, name: true, companyId: true } })
    const terminals = await csmTerminalRepo.find({ where: { id: In(terminalIds) }, select: { id: true, name: true, warWarehousesId: true, companyId: true } })
    const companies = await csmCompanyRepo.find({ where: {}, select: { id: true, aclId: true, aclCode: true, ruc: true, companyName: true } })
    const companiesIdMap: Map<number, ComCompanies> = new Map(companies.map(w => [w.id, w]))

    const warehouseIdMap: Map<number, WarWarehouses> = new Map(warehouses.map(w => [w.id, w]))

    const dataTerminals: { aclCode: string, ruc: string, companyName: string, warehouseId: number, warehouseName: string, terminalId: number, terminalName: string, salesCount: number, salesMount: number }[] = []

    terminals.forEach(t => {

      const warehouse = warehouseIdMap.get(t.warWarehousesId ?? 0)
      const company = companiesIdMap.get(t.companyId ?? 0)
      const data = terminalSales.get(t.id)
      dataTerminals.push({
        aclCode: company?.aclCode ?? '',
        companyName: company?.companyName ?? '',
        ruc: company?.ruc ?? '',
        warehouseId: warehouse?.id ?? 0,
        warehouseName: warehouse?.name ?? '',
        terminalId: t.id ?? 0,
        terminalName: t.name ?? '',
        salesCount: data?.salesCount ?? 0,
        salesMount: data?.salesMount ?? 0,
      })

    })


    csmNodeTerminals[csmNode].status = 'finished'
    csmNodeTerminals[csmNode].finishedAt = new Date()
    csmNodeTerminals[csmNode].data = dataTerminals
    console.log(`Data processing for node ${csmNode} finished`)

  } catch (error) {
    console.log('Error processing data for node ', csmNode, error)
    csmNodeTerminals[csmNode].status = 'error'
    csmNodeTerminals[csmNode].finishedAt = new Date()
  }


}

async function getDataWarehouses(csmNode: string) {

  csmNodeWarehouses[csmNode] = {
    status: 'processing',
    startedAt: new Date(),
    finishedAt: null,
  }
  try {

    console.log(` NODE NAME ${csmNode}`)
    const datasource = getDatasource(csmNode)


    const csmWarehouseProductsRepo = datasource.products.getRepository(WarWarehousesProducts)

    const warehouseProductsCount: { warehouseId: number, productsCount: number }[] = await csmWarehouseProductsRepo
      .createQueryBuilder("warProduct")
      .select("warProduct.warehouse_id", "warehouseId")
      .addSelect("COUNT(1)", "productsCount")
      .groupBy("warProduct.warehouse_id")
      .withDeleted()
      .getRawMany();


    const warehouseProductsMap: Map<number, number> = new Map(warehouseProductsCount.map(wp => [wp.warehouseId, Number(wp.productsCount)]))

    const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
    const csmWarehousesRepo = datasource.products.getRepository(WarWarehouses)

    const warehousesIds = Array.from(new Set(warehouseProductsCount.map(wp => wp.warehouseId)))

    const warehouses = await csmWarehousesRepo.find({ where: { id: In(warehousesIds) }, select: { id: true, name: true, companyId: true } })
    const companies = await csmCompanyRepo.find({ where: {}, select: { id: true, aclId: true, aclCode: true, ruc: true, companyName: true } })
    const companiesIdMap: Map<number, ComCompanies> = new Map(companies.map(w => [w.id, w]))

    const dataWarehouses: { aclCode: string, ruc: string, companyName: string, warehouseId: number, warehouseName: string, productsCount: number }[] = []

    warehouses.forEach(war => {
      if (!war.companyId) return
      const company = companiesIdMap.get(war.companyId)
      if (!company) return
      const productsCount = warehouseProductsMap.get(war.id)
      dataWarehouses.push({
        aclCode: company?.aclCode?.trim() ?? '',
        companyName: company?.companyName?.trim() ?? '',
        ruc: company?.ruc?.trim() ?? '',
        warehouseId: war?.id,
        warehouseName: war?.name.trim() ?? '',
        productsCount: productsCount ?? 0,
      })

    })

    csmNodeWarehouses[csmNode].status = 'finished'
    csmNodeWarehouses[csmNode].finishedAt = new Date()
    csmNodeWarehouses[csmNode].data = dataWarehouses

    console.log(`Data processing for node ${csmNode} finished`)

  } catch (error) {
    console.log('Error processing data for node ', csmNode, error)
    csmNodeWarehouses[csmNode].status = 'error'
    csmNodeWarehouses[csmNode].finishedAt = new Date()
  }


}


app.get('abstract-terminals/csm-node/:csmNode', async (c) => {
  const csmNode = c.req.param().csmNode
  const force = c.req.query('force')
  if (csmNodeTerminals[csmNode] && csmNodeTerminals[csmNode].status === 'processing' && !force) {
    return c.json({
      csmNode: csmNode,
      message: 'data is being processed, please try again later',
    })
  }
  if (csmNodeTerminals[csmNode] && csmNodeTerminals[csmNode].status === 'finished' && !force) {
    return c.json({
      csmNode: csmNode,
      message: 'data has been processed',
      data: csmNodeTerminals[csmNode].data,
      startedAt: csmNodeTerminals[csmNode].startedAt,
      finishedAt: csmNodeTerminals[csmNode].finishedAt,
    })
  }
  if (csmNodeTerminals[csmNode] && csmNodeTerminals[csmNode].status === 'error' && !force) {
    return c.json({
      csmNode: csmNode,
      message: 'an error occurred in the last processing, reprocessing',
      startedAt: csmNodeTerminals[csmNode].startedAt,
      finishedAt: csmNodeTerminals[csmNode].finishedAt,
    })
  }

  // iniciar proceso de obtencion de datos

  getDataTerminal(csmNode)


  return c.json({
    csmNode: csmNode,
    message: 'initiated data processing'

  })
})

app.get('abstract-skus-warehouses/csm-node/:csmNode', async (c) => {
  const csmNode = c.req.param().csmNode
  const force = c.req.query('force')
  if (csmNodeWarehouses[csmNode] && csmNodeWarehouses[csmNode].status === 'processing' && !force) {
    return c.json({
      csmNode: csmNode,
      message: 'data is being processed, please try again later',
    })
  }
  if (csmNodeWarehouses[csmNode] && csmNodeWarehouses[csmNode].status === 'finished' && !force) {
    return c.json({
      csmNode: csmNode,
      message: 'data has been processed',
      data: csmNodeWarehouses[csmNode].data,
      startedAt: csmNodeWarehouses[csmNode].startedAt,
      finishedAt: csmNodeWarehouses[csmNode].finishedAt,
    })
  }
  if (csmNodeWarehouses[csmNode] && csmNodeWarehouses[csmNode].status === 'error' && !force) {
    return c.json({
      csmNode: csmNode,
      message: 'an error occurred in the last processing, reprocessing',
      startedAt: csmNodeWarehouses[csmNode].startedAt,
      finishedAt: csmNodeWarehouses[csmNode].finishedAt,
    })
  }

  // iniciar proceso de obtencion de datos

  getDataWarehouses(csmNode)


  return c.json({
    csmNode: csmNode,
    message: 'initiated data processing'

  })
})


app.post('abstract-sales/init-update', async (c) => {
  const body = await c.req.json()
  const force = body['force'] === true
  console.log(body)
  updateAbstractSales(String(body['nodeName']), Number(body['chunkSize']), force)
  return c.json({
    ok: 'ok'
  })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  idleTimeout: 240,
};