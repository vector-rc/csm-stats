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
import { Between, Equal, Not } from "typeorm"
import { PurDocuments } from "./csm-purchase/csm-purchase.entity"
import { updateAbstractSales } from "./update-abstract-sales"
import { AclTemplate } from "./acl-template/acl-template.entity";

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
    start: start.getTime() ,
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

  const csmPurchasesRepo = datasource.sales.getRepository(PurDocuments)
  const abstractSaleRepo = datasource.sales.getRepository(AbstractSale)

  const firstSale = await abstractSaleRepo.findOne({ where: { aclId: aclCompany?.id, emittedAt: Not(Equal(0)) }, order: { emittedAt: 'ASC' } })
  const lastSale = await abstractSaleRepo.findOne({ where: { aclId: aclCompany?.id, emittedAt: Not(Equal(0)) }, order: { emittedAt: 'DESC' } })
  const lastPurchase = await csmPurchasesRepo.findOne({ where: { companyId: csmCompany?.id }, order: { documentDateNumber: 'DESC' } })
  const today = new Date()

  const dateMonth1 = new Date(today.getFullYear(), today.getMonth() - 1, 2);
  const dateMonth1Range = getMonthUnixRange(dateMonth1);
  const salesMonth1 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, emittedAt: Between(dateMonth1Range.start, dateMonth1Range.end) }, select: { id: true, amount: true } })
  const purchasesMonth1 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth1Range.start, dateMonth1Range.end) }, select: { id: true, amount: true } })


  const dateMonth2 = new Date(today.getFullYear(), today.getMonth() - 2, 2);
  const dateMonth2Range = getMonthUnixRange(dateMonth2);
  const salesMonth2 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, emittedAt: Between(dateMonth2Range.start, dateMonth2Range.end) }, select: { id: true, amount: true } })
  const purchasesMonth2 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth2Range.start, dateMonth2Range.end) }, select: { id: true, amount: true } })


  const dateMonth3 = new Date(today.getFullYear(), today.getMonth() - 3, 2);
  const dateMonth3Range = getMonthUnixRange(dateMonth3);
  const salesMonth3 = await abstractSaleRepo.find({ where: { aclId: aclCompany?.id, emittedAt: Between(dateMonth3Range.start, dateMonth3Range.end) }, select: { id: true, amount: true } })
  const purchasesMonth3 = await csmPurchasesRepo.find({ where: { companyId: csmCompany?.id, documentDateNumber: Between(dateMonth3Range.start, dateMonth3Range.end) }, select: { id: true, amount: true } })

  return c.json({
    company_id: csmCompany?.id,
    acl_id: aclCompany?.id,
    acl_code: aclCompany?.codeCompany,
    first_sale_date: new Date(firstSale?.emittedAt ?? 0),
    last_sale_date: new Date(lastSale?.emittedAt ?? 0),
    last_purchase_date: lastPurchase?.dateDocument,
    last_trhee_months: [
      { month_name: getMonthName(dateMonth1), month_number: dateMonth1.getMonth() + 1, sales_count: salesMonth1.length, sales_amount: salesMonth1.reduce((acc: number, c: AbstractSale) => (acc + c.amount), 0), purchases_count: purchasesMonth1.length, purchases_amount: purchasesMonth1.reduce((acc: number, c: PurDocuments) => (acc + (c.amount ?? 0)), 0) },
      { month_name: getMonthName(dateMonth2), month_number: dateMonth2.getMonth() + 1, sales_count: salesMonth2.length, sales_amount: salesMonth2.reduce((acc: number, c: AbstractSale) => (acc + c.amount), 0), purchases_count: purchasesMonth2.length, purchases_amount: purchasesMonth2.reduce((acc: number, c: PurDocuments) => (acc + (c.amount ?? 0)), 0) },
      { month_name: getMonthName(dateMonth3), month_number: dateMonth3.getMonth() + 1, sales_count: salesMonth3.length, sales_amount: salesMonth3.reduce((acc: number, c: AbstractSale) => (acc + c.amount), 0), purchases_count: purchasesMonth3.length, purchases_amount: purchasesMonth3.reduce((acc: number, c: PurDocuments) => (acc + (c.amount ?? 0)), 0) },

    ],
    employees_count: employeesCount,
    warehouses_count: warehousesCount,
    subsidiaries_count: subsidiariesCount,
    deliveries_count: deliveriesCount,
    sellers_count: sellersCount
  })
})

app.post('abstract-sales/init-update', async (c) => {
  const body = await c.req.json()
  console.log(body)
  updateAbstractSales(String(body['nodeName']), Number(body['chunkSize']))
  return c.json({
    ok: 'ok'
  })
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  idleTimeout: 120,
};