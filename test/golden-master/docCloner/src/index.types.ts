import { EventBus } from "gold-sight";
type GlobalConfig = UserConfig &
  Features & {
    isBrowser: boolean;
  };

type UserConfig = {
  autoForce: boolean;
};

type Features = {};

type EventContext = {
  event?: EventBus;
  eventUUID?: string;
};

type FluidPropertyData = {
  metaData: FluidPropertyMetaData;
  forceValue?: string;
  ranges?: FluidRange[];
};

type FluidPropertyMetaData = {
  property: string;
  orderID: number;
};

type FluidRange = {
  minBp: number;
  maxBp: number;
  minValue: FluidValue[][];
  maxValue: FluidValue[][];
};

type FluidValue = {
  type: "single" | "string";
};
type FluidValueSingle = {
  type: "single";
  value: number;
  unit: string;
};

export type {
  EventContext,
  GlobalConfig,
  UserConfig,
  Features,
  FluidPropertyMetaData,
  FluidRange,
  FluidValue,
  FluidValueSingle,
  FluidPropertyData,
};
