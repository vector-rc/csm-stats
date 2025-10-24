import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_ENTERPRISE_WAREHOUSES_DATABASE_ID =
  process.env.NOTION_ENTERPRISE_WAREHOUSES_DATABASE_ID;
const NOTION_BASE_URL = "https://api.notion.com/v1";

export const proxyNotionController = new Hono().get(
  "warehouses/:warehouseId",
  async (c) => {
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
        `${NOTION_BASE_URL}/databases/${NOTION_ENTERPRISE_WAREHOUSES_DATABASE_ID}/query"`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NOTION_TOKEN}`,
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
  }
);
