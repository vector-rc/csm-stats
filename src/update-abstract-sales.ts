import { Between, IsNull } from "typeorm";
import { ComCompanies } from "./csm-company/csm-company.entity"
import { SalDocuments } from "./csm-sale/csm-sale.entity"
import { getDatasource } from "./datasources"
import { AbstractSale } from "./abstract-sale/sale-abstract.entity";
export async function updateAbstractSales(
    nodeName: string,
    chunkSize: number,
) {

    const datasource = getDatasource(nodeName)

    await datasource.sales.query(`
    CREATE TABLE IF NOT EXISTS abstract_sale (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT,
        acl_id INT,
        amount DECIMAL(12,2),
        type TINYINT,
        state TINYINT,
        emitted_at BIGINT(20),
        created_at BIGINT(20)
);`
    )

    // datasource.sales.setOptions({ entities: [ComCompanies, ComDelivery, ComEmployee, PurDocuments, SalDocuments, ComSubsidiaries, AbstractSale] })


    const csmCompanyRepo = datasource.sales.getRepository(ComCompanies)
    const abstractSaleRepo = datasource.sales.getRepository(AbstractSale)

    const csmSalesRepo = datasource.sales.getRepository(SalDocuments)
    const companies = await csmCompanyRepo.find({ select: { id: true, aclId: true } })
    const companiesMap = Object.fromEntries(
        companies.map((c) => [c.id, c.aclId])
    );

    const lastAbstractSale = await abstractSaleRepo.findOne({ where: {}, select: { id: true, saleId: true }, order: { id: 'DESC' } })
    let firstId = 0
    // console.log(companiesMap);
    if (!lastAbstractSale) {
        const firstSale = await csmSalesRepo.findOne({ where: {}, select: { id: true }, order: { id: 'ASC' } })

        if (!firstSale) return;

        firstId = firstSale.id ?? 1;
    } else {
        firstId = lastAbstractSale.saleId

    }


    const lastSale = await csmSalesRepo.findOne({ where: {}, select: { id: true }, order: { id: 'DESC' } })

    if (!lastSale || !lastSale.id) return;

    const lastId = lastSale.id;

    if ((lastId - firstId) <= 0) {
        console.log('No hay filas para escanear ', lastId - firstId)
        return
    }

    const chunksCount = (lastId - firstId) / chunkSize;

    for (let i = 0; i <= chunksCount; i++) {
        const fromId = i * chunkSize + firstId;
        const toId =
            Math.floor(chunksCount) === i
                ? lastId
                : i * chunkSize + chunkSize + firstId - 1;
        console.log(`📥 Scanning rows ${fromId} - ${toId} `);

        const sales = await csmSalesRepo.find({ where: { id: Between(fromId, toId), deletedAt: IsNull() }, select: { id: true, companyId: true, createdAt: true, amount: true, salTypeDocumentId: true, salStatesId: true, dateEmission: true } })


        if (sales && sales.length) {

            const salesToInsert: AbstractSale[] = []
            sales.forEach((sale) => {
                const aclId = companiesMap[sale.companyId]
                if (!aclId) return
                const createdAt = sale.createdAt ? (Number.isNaN(sale.createdAt?.getTime()) ? 0 : sale.createdAt?.getTime()) : 0
                const emittedAt = sale.dateEmission ? (Number.isNaN(sale.dateEmission?.getTime()) ? 0 : sale.dateEmission?.getTime()) : 0

                salesToInsert.push({
                    aclId,
                    // companyId: sale.companyId,
                    amount: sale.amount ?? 0,
                    createdAt,
                    type: sale.salTypeDocumentId ?? 0,
                    emittedAt,
                    state: sale.salStatesId ?? 0,
                    saleId: sale.id ?? 0,
                })
            })

            await abstractSaleRepo.insert(salesToInsert);
            console.log(
                `📥 Rows scanned in interval ${fromId} - ${toId} completed ${sales.length}`
            );
        }
        console.log(`DATETIME :${new Date().toISOString()}`);
    }
}
