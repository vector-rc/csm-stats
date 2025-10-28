import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const NOTION_ACCESS_TOKEN = process.env.NOTION_ACCESS_TOKEN;
const NOTION_WAREHOUSES_DATABASE_ID = process.env.NOTION_WAREHOUSES_DATABASE_ID;
const NOTION_BASE_URL = "https://api.notion.com/v1";

export const proxyNotionController = new Hono()
  .get("warehouses", async (c) => {
    const filter: any = {
      and: [
        {
          property: "Uso del sistema",
          checkbox: {
            equals: true,
          },
        },
      ],
    };

    if (c.req.query("department") && c.req.query("department")?.trim() !== "") {
      filter.and.push({
        property: "Departamento",
        select: {
          equals: c.req.query("department")?.trim(),
        },
      });
    }
    if (c.req.query("province") && c.req.query("province")?.trim() !== "") {
      filter.and.push({
        property: "Provincia",
        select: {
          equals: c.req.query("province")?.trim(),
        },
      });
    }
    if (c.req.query("district") && c.req.query("district")?.trim() !== "") {
      filter.and.push({
        property: "Distrito",
        select: {
          equals: c.req.query("district")?.trim(),
        },
      });
    }
    if (c.req.query("rubro") && c.req.query("rubro")?.trim() !== "") {
      filter.and.push({
        property: "Rubro",
        rollup: {
          any: {
            select: {
              equals: c.req.query("rubro")?.trim(),
            },
          },
        },
      });
    }
    if (c.req.query("ubigeo") && c.req.query("ubigeo")?.trim() !== "") {
      filter.and.push({
        property: "Ubigeo",
        rich_text: {
          equals: c.req.query("ubigeo")?.trim(),
        },
      });
    }

    const bodyReq = JSON.stringify({
      filter,
    });
    try {
      const response = await fetch(
        `${NOTION_BASE_URL}/databases/${NOTION_WAREHOUSES_DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NOTION_ACCESS_TOKEN}`,
            "Notion-Version": "2022-06-28",
          },
          body: bodyReq,
        }
      );

      const responseBody = await response.json();
      return c.json(responseBody);
    } catch (_error) {
      const error = _error as Error;
      console.log(error);
      throw new HTTPException(400, { message: error.message });
    }
  })
  .get("warehouses/:warehouseId", async (c) => {
    const warehouseId = c.req.param().warehouseId;

    const bodyReq = JSON.stringify({
      filter: {
        and: [
          {
            property: "id Tienda",
            rich_text: {
              equals: String(warehouseId),
            },
          },
        ],
      },
    });
    try {
      const response = await fetch(
        `${NOTION_BASE_URL}/databases/${NOTION_WAREHOUSES_DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NOTION_ACCESS_TOKEN}`,
            "Notion-Version": "2022-06-28",
          },
          body: bodyReq,
        }
      );

      const responseBody = await response.json();
      return c.json(responseBody);
    } catch (_error) {
      const error = _error as Error;
      console.log(error);
      throw new HTTPException(400, { message: error.message });
    }
  });
