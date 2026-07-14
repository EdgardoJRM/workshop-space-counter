import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOtoOrNonWorkshopLineItem,
  parseWorkshopTicketQuantity,
} from "./clickfunnels-line-items";

describe("isOtoOrNonWorkshopLineItem", () => {
  it("detects libro de segmentacion OTO", () => {
    assert.equal(isOtoOrNonWorkshopLineItem("Libro ED Segmentación"), true);
    assert.equal(isOtoOrNonWorkshopLineItem("Segmentation Workbook"), true);
  });

  it("does not flag workshop tickets", () => {
    assert.equal(isOtoOrNonWorkshopLineItem("Duplica Tus Ventas — Boleto"), false);
    assert.equal(isOtoOrNonWorkshopLineItem("Emerald Mentoring Program"), false);
  });
});

describe("parseWorkshopTicketQuantity", () => {
  it("excludes OTO line items from ticket count", () => {
    assert.equal(
      parseWorkshopTicketQuantity({
        data: {
          line_items: [
            { quantity: 1, original_product: { name: "Duplica Tus Ventas" } },
            { quantity: 1, original_product: { name: "Libro ED Segmentación" } },
          ],
        },
      }),
      1
    );
  });

  it("sums multiple workshop tickets", () => {
    assert.equal(
      parseWorkshopTicketQuantity({
        data: {
          line_items: [
            { quantity: 2, original_product: { name: "Duplica Tus Ventas" } },
            { quantity: 1, original_product: { name: "Libro ED Segmentación" } },
          ],
        },
      }),
      2
    );
  });
});
