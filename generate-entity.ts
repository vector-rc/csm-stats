import mysql from "mysql2/promise";
import fs from "fs";

async function generateEntity(tableName: string, schema: string) {
  // const connection = await mysql.createConnection({
  //  host: "n1productsdb.cytc2oec81wd.us-east-1.rds.amazonaws.com",
  // user: "admin",
  // password: "RcGzrKHK7v15e0Q9gJTOykyxD9HHtotH",
  //   database: schema,
  // });
  // const connection = await mysql.createConnection({
  //  host: "dbacl.cytc2oec81wd.us-east-1.rds.amazonaws.com",
  // user: "admin",
  // password: "HOJTgEG517cr4DTcdanFUOZSx1knifxJ",
  //   database: schema,
  // });
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    port: 3309,
    password: "toor",
    database: schema,
  });
  // const connection = await mysql.createConnection({
  //   host: "n1salesdb.cytc2oec81wd.us-east-1.rds.amazonaws.com",
  //   user: "admin",
  //   password: "lkaWlgSS1DIOYgzGDRnFCixnzxCN916w",
  //   database: schema,
  // });

  const [rows] = await connection.execute<any[]>(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT 
     FROM information_schema.columns 
     WHERE table_schema = ? AND table_name = ? 
     ORDER BY ORDINAL_POSITION`,
    [schema, tableName]
  );

  // Mapeo de tipos MySQL → TypeScript
  const typeMap: Record<string, string> = {
    int: "number",
    bigint: "number",
    smallint: "number",
    mediumint: "number",
    tinyint: "number",
    decimal: "number",
    numeric: "number",
    float: "number",
    double: "number",
    varchar: "string",
    char: "string",
    text: "string",
    mediumtext: "string",
    longtext: "string",
    json: "any",
    date: "Date",
    datetime: "Date",
    timestamp: "Date",
    time: "string",
    year: "number",
    enum: "string",
    set: "string",
    blob: "Buffer",
    longblob: "Buffer",
    mediumblob: "Buffer",
    tinyblob: "Buffer",
  };

  // Convierte nombres snake_case → camelCase
  const toCamel = (s: string) =>
    s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  // Nombre de clase PascalCase
  const className =
    tableName.charAt(0).toUpperCase() +
    tableName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  let entity = `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'\n\n`;
  entity += `@Entity('${tableName}', { schema: '${schema}' })\n`;
  entity += `export class ${className} {\n`;

  for (const col of rows) {
    const tsType = typeMap[col.DATA_TYPE] || "any";
    const optional =
      col.IS_NULLABLE === "YES" || col.COLUMN_DEFAULT !== null ? "?" : "";

    if (col.COLUMN_KEY === "PRI") {
      entity += `  @PrimaryGeneratedColumn()\n`;
      entity += `  ${toCamel(col.COLUMN_NAME)}${optional}: ${tsType}\n\n`;
    } else {
      let options = `{ name: '${col.COLUMN_NAME}'`;

      // 👇 Forzar mapeo correcto para json
      // if (col.DATA_TYPE === "json") options += `, type: 'json'`;
      // if (col.DATA_TYPE === "text" || col.DATA_TYPE.includes("text"))
      options += `, nullable: ${optional?'true':'false'}`;
      options += `, type: '${col.DATA_TYPE}'`;

      options += ` }`;

      entity += `  @Column(${options})\n`;
      entity += `  ${toCamel(col.COLUMN_NAME)}${optional}: ${tsType}\n\n`;
    }
  }

  entity += `}`;

  //   fs.writeFileSync(`${className}.ts`, entity);

  //   console.log(`✅ Entity generada: ${className}.ts`);
  console.log(entity)
  await connection.end();
}

const [, , schemaArg, tableArg] = process.argv;

if (!tableArg || !schemaArg) {
  console.error("❌ Uso: ts-node generate-entity.ts <tabla> <schema>");
  process.exit(1);
}

generateEntity(tableArg, schemaArg);
