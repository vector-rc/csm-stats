import { writeFileSync } from "fs";

const aclCodes: string[] = ['QRR','BBA3','EMP2604MME','EMP2543MAG','EMP2161ARL','EMP2053JFR','EMP1965PIL','EMP1899TAL','EMP1619TAC','IMAC4','EMP647LOSN','EMP624BODE','5tyy788','IGS5','EMP648GANY','LED5','Rojas2','SALCEDO','5TDFGDG']
// const aclCodes: string[] = ['EMP3101KIM', 'EMP3071COR', 'EMP3057MAR', 'EMP3054BIO', 'EMP3016EDI', 'EMP2964PAN', 'EMP2941CEC', 'EMP2917ERI', 'EMP2877HUB', 'EMP2860JOS', 'EMP2855EMP', 'EMP2854DME', 'EMP2822LAS', 'EMP2803LCU', 'EMP2801RMO', 'EMP2795MIN', 'EMP2782MAL', 'EMP2703MEX', 'EMP2670COM', 'EMP2633UNO', 'EMP2628COM', 'EMP2589OFE', 'EMP2587CHA', 'EMP2545ROY', 'EMP2492HYP', 'EMP2471DIA', 'EMP2427LAS', 'EMP2377SUP', 'EMP2376LCO', 'EMP2333MIX', 'EMP2322GOR', 'EMP2316PER', 'EMP2251EST', 'EMP2226ECR', 'EMP2208ORO', 'EMP2172NPA', 'EMP2141EDG', 'EMP2126MAR', 'EMP2110BLA', 'EMP2101LIC', 'EMP2060COS', 'EMP2059LIC', 'EMP2053JFR', 'EMP2039HAN', 'EMP2027SDE', 'EMP2026ARI', 'EMP2024BOD', 'EMP1965PIL', 'EMP1959JHU', 'EMP1933CES', 'EMP1937LA4', 'EMP1924INV', 'EMP1909KOR', 'EMP1895XIO', 'EMP1847MAR', 'EMP1832RAU', 'EMP1827MAR', 'EMP1802LIC', 'EMP1746CIT', 'EMP1699DOY', 'EMP1674LIC', 'EMP1643COM', 'EMP1618DME', 'EMP1630AND', 'EMP1584TUK', 'EMP1572MIN', 'DMC2', 'EMP1546PAN', 'EMP1545CRI', 'EMP1525TAB', 'EMP1497LAC', 'EMP1496LOS', 'EMP140335M', 'EMP634MINI', 'EMP698DIST', 'TCL3', 'EMP637BODE', 'EMP621MARK', 'EMP623CRIS', 'EMP673VALE', 'EMP642ALEK', 'EMP687NUTR', 'BBNJ5070', 'EMP675BHAR', 'EMP697DELI', 'EMP61MULTI', 'EMP699ISAI', 'EMP675ROGE', 'EMP661AURI', 'EMP622MLAE', 'EMP684INFR', 'EMP624BODE', 'EMP661LAES', 'EMP684CARO', 'EMP666BODE', 'EMP628TANI', 'EMP697MARI', 'EMP696LICO', 'EMP698BNAU', 'EMP60DANIL', 'EMP653SWEE', 'EMP612PANA', 'EMP6100SOT', 'EMP698COME', 'EMP683LICO', 'EMP631BODE', 'EMP671ZAIC', 'EMP698ELOS', 'EMP681CORP', 'NMDO', 'EMP663MZIA', 'EMP621BODE', 'EMP640SAND', 'EMP615MRDR', 'EMP681SHAM', 'EMP618CASE', 'EMP662GOOD', 'EMP694BODE', 'EMP673MEND', 'EMP646MEGA', 'EMP61NATIJ', 'EMP662COPA', 'EMP66LERMO', 'EMP660ELBR', 'EMP648INVE', 'EMP654FELI', 'EMP678YIMM', 'EMP620GUEV', 'EMP610MINI', 'EMP611INVE', 'EMP672DIST', 'EMP635BELL', 'MSV3', 'LPP7', 'EMP623AGUI', 'EMP671ELMA', 'EMP633MORA', 'MAM4', '1046839901', 'BBK5', 'PLY6', 'AA2', 'MG1', 'TAPIA2', 'ROCO', 'MATTOS', 'CAHUA', 'CALDE', 'MARIL2', 'SANNA2', 'D12T', 'DENI2', 'FHARMASA', '01camp', 'MOREA2', '021TURIN', 'PRIMAVERA2', 'ABR001', 'VERMILION', 'PEREZ2', 'GOLEM04', 'NEC002', 'VILA021', 'DELGADO012', 'VELA', 'NALDO', 'VGARCIA', 'LALFREDO', 'LLAC', 'gqegqe33', 'DEL001', 'TIENDITA ', 'TGS', 'a22ghfeee', 'CAFE001', 'Dmeza001', 'DeliYamp', 'ghbnjmvc', 'RRH', 'PERU001', 'CCS', 'VIVA001', 'QUISPE ', 'RAMOS', 'MGG', 'SEA001', 'MDV', 'SANDRAR']
let csvWarehousesString = `CSM_NODE,ACL_ID,ACL_CODE,RUC,RAZON_SOCIAL,WAREHOUSE_ID,WAREHOUSE_NAME,SALES_COUNT,SALES_MOUNT,PRODUCTS_COUNT\n`
let csvTerminalString = `CSM_NODE,ACL_ID,ACL_CODE,RUC,RAZON_SOCIAL,WAREHOUSE_ID,WAREHOUSE_NAME,TERMINAL_ID,TERMINAL_NAME,SALES_COUNT,SALES_MOUNT\n`

console.log('CODES COUNT', aclCodes.length)
async function main() {
    for (const aclCode of aclCodes) {
        console.log('Fetching data for ACL Code:', aclCode)
        try {
            const res = await fetch(`https://stats.casamarketapp.com/abstract-sales/acl-code/${aclCode}`)
            const data: {
                csm_node: string,
                acl_id: number,
                acl_code: string,
                company_id: number,
                companyRuc: string,
                companyName: string,
                warehouses: {
                    id: number,
                    name: string,
                    salesCount: number,
                    salesMount: number,
                    productsCount: number
                }[],
                terminals: {
                    id: number,
                    name: string,
                    warehouseId: number,
                    warehouseName: string,
                    salesCount: number,
                    salesMount: number
                }[]
            } = await res.json()
            console.log(JSON.stringify(data, null, 2))
            for (const w of data.warehouses) {
                csvWarehousesString += `${data.csm_node},${data.acl_id},"${data.acl_code}","${data.companyRuc}","${data.companyName}",${w.id},"${w.name}",${w.salesCount},${w.salesMount},${w.productsCount}\n`
            }
            for (const t of data.terminals) {
                csvTerminalString += `${data.csm_node},${data.acl_id},"${data.acl_code}","${data.companyRuc}","${data.companyName}",${t.warehouseId},"${t.warehouseName}",${t.id},"${t.name}",${t.salesCount},${t.salesMount}\n`
            }
        } catch (error) {
            console.error('Error fetching data for ACL Code:', aclCode, error)
        }

        await new Promise(res => setTimeout(res, 200)) // to avoid rate limit   

    }

    writeFileSync('report-warehouses.csv', csvWarehousesString)
    writeFileSync('report-terminals.csv', csvTerminalString)

}

main()

