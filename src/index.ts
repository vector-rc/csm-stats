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
import { WarProduct } from "./csm-product/war-product.entity";
import { CsmTypeDocument } from "./csm-document-type.entity";

process.env.TZ = "UTC";
const app = new Hono()

app.use('/*', cors())
app.use(logger())

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

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
  const csmNode = aclTemplate?.settings.domains.find((d: any) => d.code === 'PRODUCTS_URL').endPoint.replace('https://', '').split('.')[0]
  const datasource = getDatasource(csmNode)

  const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
  const csmCompany = await csmCompanyRepo.findOneBy({ aclId: aclCompany?.id })

  if (!csmCompany) {
    return c.json({ error: `Company not found in node ${csmNode} ` }, 404)
  }

  const csmEmployeesRepo = datasource.sales.getRepository(ComEmployee)
  const employeesCount = await csmEmployeesRepo.countBy({ companyId: csmCompany?.id })
  const sellersCount = await csmEmployeesRepo.countBy({ companyId: csmCompany?.id })

  const csmDeliveriesRepo = datasource.sales.getRepository(ComDelivery)
  const deliveriesCount = await csmDeliveriesRepo.countBy({ companyId: csmCompany?.id })

  const csmDocumentTypesRepo = datasource.sales.getRepository(CsmTypeDocument)
  const documentTypes = await csmDocumentTypesRepo.find()

  const docTypesMap = Object.fromEntries(documentTypes.map(dt => [dt.id, dt]))

  const csmSubsidiariesRepo = datasource.sales.getRepository(ComSubsidiaries)
  const subsidiariesCount = await csmSubsidiariesRepo.countBy({ companyId: csmCompany?.id })

  const csmWarehousesRepo = datasource.products.getRepository(WarWarehouses)
  const warehouses = await csmWarehousesRepo.findBy({ companyId: csmCompany?.id })

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
  const nameMonth1 = getMonthName(dateMonth1);
  const dateMonth1Range = getMonthUnixRange(dateMonth1);
  const salesMonth1 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, createdAt: Between(dateMonth1Range.start, dateMonth1Range.end) }, select: { id: true, amount: true, warehouseId: true, type: true } })
  const purchasesMonth1 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth1Range.start, dateMonth1Range.end), deletedAt: IsNull() }, select: { id: true, amount: true, warehouseId: true, typeDocumentId: true } })


  const dateMonth2 = new Date(today.getFullYear(), today.getMonth() - 2, 2);
  const nameMonth2 = getMonthName(dateMonth2);
  const dateMonth2Range = getMonthUnixRange(dateMonth2);
  const salesMonth2 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, createdAt: Between(dateMonth2Range.start, dateMonth2Range.end) }, select: { id: true, amount: true, warehouseId: true, type: true } })
  const purchasesMonth2 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth2Range.start, dateMonth2Range.end), deletedAt: IsNull() }, select: { id: true, amount: true, warehouseId: true, typeDocumentId: true } })


  const dateMonth3 = new Date(today.getFullYear(), today.getMonth() - 3, 2);
  const nameMonth3 = getMonthName(dateMonth3);
  const dateMonth3Range = getMonthUnixRange(dateMonth3);
  const salesMonth3 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, createdAt: Between(dateMonth3Range.start, dateMonth3Range.end) }, select: { id: true, amount: true, warehouseId: true, type: true } })
  const purchasesMonth3 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth3Range.start, dateMonth3Range.end), deletedAt: IsNull() }, select: { id: true, amount: true, warehouseId: true, typeDocumentId: true } })

  const warehousesData: Record<string, {
    id: number, name: string, code: string, ubigeo: string, department: string, province: string, district: string, last_three_months:
    { month_name: string, month_number: number, sales_count: number, sales_types_count: { total: number, facturas: number, boletas: number, otros: number }, sales_amount: number, purchases_count: number, purchases_types_count: { total: number, facturas: number, boletas: number, otros: number }, purchases_amount: number }[]
  }> = Object.fromEntries(warehouses.map(w => [w.id, { id: w.id, name: w.name, code: w.code, ubigeo: w.ubigeo ?? '--', department: w.departmentName ?? '--', province: w.provinceName ?? '--', district: w.districtName ?? '--', last_three_months: [] }]))

  const month1DataTotal = { month_name: nameMonth1, month_number: dateMonth1.getMonth() + 1, sales_count: salesMonth1.length, sales_amount: 0, sales_types_count: { total: salesMonth1.length, facturas: 0, boletas: 0, otros: 0 }, purchases_count: purchasesMonth1.length, purchases_amount: 0, purchases_types_count: { total: purchasesMonth1.length, facturas: 0, boletas: 0, otros: 0 } }
  const month1Data = Object.fromEntries(warehouses.map(w => [w.id, { month_name: nameMonth1, month_number: dateMonth1.getMonth() + 1, sales_count: 0, sales_types_count: { total: 0, facturas: 0, boletas: 0, otros: 0 }, sales_amount: 0, purchases_count: 0, purchases_types_count: { total: 0, facturas: 0, boletas: 0, otros: 0 }, purchases_amount: 0 }]))
  const month2DataTotal = { month_name: nameMonth2, month_number: dateMonth2.getMonth() + 1, sales_count: salesMonth2.length, sales_amount: 0, sales_types_count: { total: salesMonth2.length, facturas: 0, boletas: 0, otros: 0 }, purchases_count: purchasesMonth2.length, purchases_amount: 0, purchases_types_count: { total: purchasesMonth2.length, facturas: 0, boletas: 0, otros: 0 } }
  const month2Data = Object.fromEntries(warehouses.map(w => [w.id, { month_name: nameMonth2, month_number: dateMonth2.getMonth() + 1, sales_count: 0, sales_types_count: { total: 0, facturas: 0, boletas: 0, otros: 0 }, sales_amount: 0, purchases_count: 0, purchases_types_count: { total: 0, facturas: 0, boletas: 0, otros: 0 }, purchases_amount: 0 }]))
  const month3DataTotal = { month_name: nameMonth3, month_number: dateMonth3.getMonth() + 1, sales_count: salesMonth3.length, sales_amount: 0, sales_types_count: { total: salesMonth3.length, facturas: 0, boletas: 0, otros: 0 }, purchases_count: purchasesMonth3.length, purchases_amount: 0, purchases_types_count: { total: purchasesMonth3.length, facturas: 0, boletas: 0, otros: 0 } }
  const month3Data = Object.fromEntries(warehouses.map(w => [w.id, { month_name: nameMonth3, month_number: dateMonth3.getMonth() + 1, sales_count: 0, sales_types_count: { total: 0, facturas: 0, boletas: 0, otros: 0 }, sales_amount: 0, purchases_count: 0, purchases_types_count: { total: 0, facturas: 0, boletas: 0, otros: 0 }, purchases_amount: 0 }]))


  salesMonth1.forEach((sal: AbstractSale) => {
    if (!sal.warehouseId) return;
    if (!warehousesData[sal.warehouseId]) return;
    month1DataTotal.sales_amount += Number(sal.amount)
    month1Data[sal.warehouseId].sales_amount += Number(sal.amount)
    month1Data[sal.warehouseId].sales_count += 1
    month1Data[sal.warehouseId].sales_types_count.total += 1
    if (docTypesMap[sal.type].code === 'FAC') {
      month1Data[sal.warehouseId].sales_types_count.facturas += 1
      month1DataTotal.sales_types_count.facturas += 1
    }
    else if (docTypesMap[sal.type].code === 'BOL') {
      month1Data[sal.warehouseId].sales_types_count.boletas += 1
      month1DataTotal.sales_types_count.boletas += 1

    }
    else {
      month1Data[sal.warehouseId].sales_types_count.otros += 1
      month1DataTotal.sales_types_count.otros += 1

    }
  })

  purchasesMonth1.forEach((pur: PurDocuments) => {
    if (!pur.warehouseId) return;
    if (!pur.typeDocumentId) return;
    if (!warehousesData[pur.warehouseId]) return;
    month1DataTotal.purchases_amount += Number(pur.amount ?? 0)
    month1Data[pur.warehouseId].purchases_amount += Number(pur.amount ?? 0)
    month1Data[pur.warehouseId].purchases_count += 1
    month1Data[pur.warehouseId].purchases_types_count.total += 1
    if (docTypesMap[pur.typeDocumentId].code === 'FAC') {
      month1Data[pur.warehouseId].purchases_types_count.facturas += 1
      month1DataTotal.purchases_types_count.facturas += 1

    }
    else if (docTypesMap[pur.typeDocumentId].code === 'BOL') {
      month1Data[pur.warehouseId].purchases_types_count.boletas += 1
      month1DataTotal.purchases_types_count.boletas += 1

    }
    else {
      month1Data[pur.warehouseId].purchases_types_count.otros += 1
      month1DataTotal.purchases_types_count.otros += 1

    }
  })

  salesMonth2.forEach((sal: AbstractSale) => {
    if (!sal.warehouseId) return;
    if (!warehousesData[sal.warehouseId]) return;
    month2DataTotal.sales_amount += Number(sal.amount)
    month2Data[sal.warehouseId].sales_amount += Number(sal.amount)
    month2Data[sal.warehouseId].sales_count += 1
    month2Data[sal.warehouseId].sales_types_count.total += 1
    if (docTypesMap[sal.type].code === 'FAC') {
      month2Data[sal.warehouseId].sales_types_count.facturas += 1
      month2DataTotal.sales_types_count.facturas += 1
    }
    else if (docTypesMap[sal.type].code === 'BOL') {
      month2Data[sal.warehouseId].sales_types_count.boletas += 1
      month2DataTotal.sales_types_count.boletas += 1

    }
    else {
      month2Data[sal.warehouseId].sales_types_count.otros += 1
      month2DataTotal.sales_types_count.otros += 1

    }
  })

  purchasesMonth2.forEach((pur: PurDocuments) => {
    if (!pur.warehouseId) return;
    if (!pur.typeDocumentId) return;
    if (!warehousesData[pur.warehouseId]) return;
    month2DataTotal.purchases_amount += Number(pur.amount ?? 0)
    month2Data[pur.warehouseId].purchases_amount += Number(pur.amount ?? 0)
    month2Data[pur.warehouseId].purchases_count += 1
    month2Data[pur.warehouseId].purchases_types_count.total += 1
    if (docTypesMap[pur.typeDocumentId].code === 'FAC') {
      month2Data[pur.warehouseId].purchases_types_count.facturas += 1
      month2DataTotal.purchases_types_count.facturas += 1

    }
    else if (docTypesMap[pur.typeDocumentId].code === 'BOL') {
      month2Data[pur.warehouseId].purchases_types_count.boletas += 1
      month2DataTotal.purchases_types_count.boletas += 1

    }
    else {
      month2Data[pur.warehouseId].purchases_types_count.otros += 1
      month2DataTotal.purchases_types_count.otros += 1

    }
  })

  salesMonth3.forEach((sal: AbstractSale) => {
    if (!sal.warehouseId) return;
    if (!warehousesData[sal.warehouseId]) return;
    month3DataTotal.sales_amount += Number(sal.amount)
    month3Data[sal.warehouseId].sales_amount += Number(sal.amount)
    month3Data[sal.warehouseId].sales_count += 1
    month3Data[sal.warehouseId].sales_types_count.total += 1
    if (docTypesMap[sal.type].code === 'FAC') {
      month3Data[sal.warehouseId].sales_types_count.facturas += 1
      month3DataTotal.sales_types_count.facturas += 1
    }
    else if (docTypesMap[sal.type].code === 'BOL') {
      month3Data[sal.warehouseId].sales_types_count.boletas += 1
      month3DataTotal.sales_types_count.boletas += 1

    }
    else {
      month3Data[sal.warehouseId].sales_types_count.otros += 1
      month3DataTotal.sales_types_count.otros += 1

    }
  })

  purchasesMonth3.forEach((pur: PurDocuments) => {
    if (!pur.warehouseId) return;
    if (!pur.typeDocumentId) return;
    if (!warehousesData[pur.warehouseId]) return;
    month3DataTotal.purchases_amount += Number(pur.amount ?? 0)
    month3Data[pur.warehouseId].purchases_amount += Number(pur.amount ?? 0)
    month3Data[pur.warehouseId].purchases_count += 1
    month3Data[pur.warehouseId].purchases_types_count.total += 1
    if (docTypesMap[pur.typeDocumentId].code === 'FAC') {
      month3Data[pur.warehouseId].purchases_types_count.facturas += 1
      month3DataTotal.purchases_types_count.facturas += 1

    }
    else if (docTypesMap[pur.typeDocumentId].code === 'BOL') {
      month3Data[pur.warehouseId].purchases_types_count.boletas += 1
      month3DataTotal.purchases_types_count.boletas += 1

    }
    else {
      month3Data[pur.warehouseId].purchases_types_count.otros += 1
      month3DataTotal.purchases_types_count.otros += 1

    }
  })

  for (const warehouseId in warehousesData) {
    if (month1Data[warehouseId])
      warehousesData[warehouseId].last_three_months.push(month1Data[warehouseId])
    if (month2Data[warehouseId])
      warehousesData[warehouseId].last_three_months.push(month2Data[warehouseId])
    if (month3Data[warehouseId])
      warehousesData[warehouseId].last_three_months.push(month3Data[warehouseId])
  }

  return c.json({
    csm_node: csmNode,
    acl_id: aclCompany?.id,
    acl_code: aclCompany?.codeCompany,
    company_id: csmCompany?.id,
    first_sale_date: firstSale?.createdAt ? new Date(firstSale?.createdAt) : null,
    last_sale_date: lastSale?.createdAt ? new Date(lastSale?.createdAt) : null,
    last_purchase_date: lastPurchase?.dateDocument ?? null,
    last_three_months: [month1DataTotal, month2DataTotal, month3DataTotal],
    employees_count: employeesCount,
    warehouses_count: warehouses.length,
    warehouses: Object.values(warehousesData),
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