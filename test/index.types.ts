type Master = {
  index: number;
  step?: number;
};
export { Master };

type PlaywrightBlueprint = {
  useServer?: boolean;
  htmlFilePath: string;
  addCss: string[];
};

export { PlaywrightBlueprint };
