import { EventContext, GlobalConfig } from "../index.types";

type SerializeDocContext = {
  globalConfig: GlobalConfig;
} & EventContext;

type PropsResults = {
  style: Record<string, string>;
  specialProps: Record<string, string>;
};

type SerializePropContext = SerializeDocContext & {
  propsResults: PropsResults;
};

type SerializeShorthandPropContext = SerializePropContext & {
  prop: string;
};

export {
  SerializeDocContext,
  PropsResults,
  SerializePropContext,
  SerializeShorthandPropContext,
};
