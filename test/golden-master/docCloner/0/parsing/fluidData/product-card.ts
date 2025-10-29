import { FluidValueSingle } from "../../../../docCloner/src/index.types";
import { FluidData } from "../../../../docCloner/src/parsing/fluidData";

function writeProductCard(fluidData: FluidData) {
  fluidData.addAutoForceProperty(
    ".product-card",
    ".product-card",
    "font-size",
    "1rem"
  );

  let anchor = fluidData.addAnchor(".product-card");
  let selector = anchor.addSelector(".product-card");
  let property = selector.addProperty("max-width");
  property.ranges = [
    {
      minBp: 375,
      maxBp: 600,
      minValue: [[{ value: 24.5, unit: "rem" } as FluidValueSingle]],
      maxValue: [[{ value: 42.85, unit: "rem" } as FluidValueSingle]],
    },
  ];

  fluidData.addAutoForceProperty(
    ".product-card",
    ".product-card",
    "border-bottom-left-radius",
    "0.71rem"
  );

  property = selector.addProperty("border-bottom-right-radius");
  property.ranges = [
    {
      minBp: 375,
      maxBp: 600,
      minValue: [[{ value: 0.71, unit: "rem" } as FluidValueSingle]],
      maxValue: [[{ value: 0.71, unit: "rem" } as FluidValueSingle]],
    },
  ];

  fluidData.addAutoForceProperty(
    ".product-card__img--mobile",
    ".product-card__img--mobile",
    "border-top-left-radius",
    "0.71rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__img--mobile",
    ".product-card__img--mobile",
    "border-top-right-radius",
    "0.71rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__img--mobile",
    ".product-card__img--mobile",
    "width",
    "100%"
  );
  fluidData.addAutoForceProperty(
    ".product-card__img--mobile",
    ".product-card__img--mobile",
    "object-position",
    "0px -5rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__img--mobile",
    ".product-card__img--mobile",
    "max-height",
    "17.14rem"
  );

  fluidData.addAutoForceProperty(
    ".product-card__category",
    ".product-card__category",
    "font-size",
    "0.85em"
  );

  fluidData.addAutoForceProperty(
    ".product-card__category",
    ".product-card__category",
    "letter-spacing",
    "0.41rem"
  );

  anchor = fluidData.addAnchor(".produt-card__category");
  selector = anchor.addSelector(".product-card__category");
  property = selector.addProperty("margin-bottom");
  property.ranges = [
    {
      minBp: 375,
      maxBp: 600,
      minValue: [[{ value: 0.85, unit: "rem" } as FluidValueSingle]],
      maxValue: [[{ value: 1.42, unit: "rem" } as FluidValueSingle]],
    },
  ];

  fluidData.addAutoForceProperty(
    ".product-card__title",
    ".product-card__title",
    "font-size",
    "2.28em"
  );

  fluidData.addAutoForceProperty(
    ".product-card__title",
    ".product-card__title",
    "line-height",
    "1em"
  );

  anchor = fluidData.addAnchor(".product-card__title");
  selector = anchor.addSelector(".product-card__title");
  property = selector.addProperty("margin-bottom");
  property.ranges = [
    {
      minBp: 375,
      maxBp: 600,
      minValue: [[{ value: 1.14, unit: "rem" } as FluidValueSingle]],
      maxValue: [[{ value: 1.71, unit: "rem" } as FluidValueSingle]],
    },
  ];

  fluidData.addAutoForceProperty(
    ".product-card__description",
    ".product-card__description",
    "line-height",
    "1.64em"
  );

  fluidData.addAutoForceProperty(
    ".product-card__description",
    ".product-card__description",
    "font-size",
    "1em"
  );

  anchor = fluidData.addAnchor(".product-card__description");
  selector = anchor.addSelector(".product-card__description");
  property = selector.addProperty("margin-bottom");
  property.ranges = [
    {
      minBp: 375,
      maxBp: 600,
      minValue: [[{ value: 1.71, unit: "rem" } as FluidValueSingle]],
      maxValue: [[{ value: 2.07, unit: "rem" } as FluidValueSingle]],
    },
  ];

  fluidData.addAutoForceProperty(
    ".product-card__price",
    ".product-card__price",
    "column-gap",
    "1.35rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__price",
    ".product-card__price",
    "row-gap",
    "1.35rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__price",
    ".product-card__price",
    "margin-bottom",
    "0px"
  );

  fluidData.addAutoForceProperty(
    ".product-card__price--actual",
    ".product-card__price--actual",
    "font-size",
    "2.28em"
  );

  fluidData.addAutoForceProperty(
    ".product-card__price--original",
    ".product-card__price--original",
    "font-size",
    "0.92em"
  );

  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "width",
    "100%"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "border-top-left-radius",
    "0.57rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "border-top-right-radius",
    "0.57rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "border-bottom-left-radius",
    "0.57rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "border-bottom-right-radius",
    "0.57rem"
  );

  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "padding-top",
    "1.07rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "padding-right",
    "1.07rem"
  );

  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "padding-bottom",
    "1.07rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "padding-left",
    "1.07rem"
  );

  anchor = fluidData.addAnchor(".product-card__button");
  selector = anchor.addSelector(".product-card__button");
  property = selector.addProperty("margin-top");
  property.ranges = [
    {
      minBp: 375,
      maxBp: 600,
      minValue: [[{ value: 1.42, unit: "rem" } as FluidValueSingle]],
      maxValue: [[{ value: 2.14, unit: "rem" } as FluidValueSingle]],
    },
  ];

  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "column-gap",
    "0.85rem"
  );
  fluidData.addAutoForceProperty(
    ".product-card__button",
    ".product-card__button",
    "row-gap",
    "0.85rem"
  );
}

export { writeProductCard };
