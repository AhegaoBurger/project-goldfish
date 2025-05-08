import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

const client = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

const readDynamicFields = async () => {
  const result: any = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  while (hasNextPage) {
    const {
      data,
      nextCursor,
      hasNextPage: nextPage,
    } = await client.getDynamicFields({
      parentId:
        "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0",
      cursor: cursor,
    });
    cursor = nextCursor;
    hasNextPage = nextPage;
    result.push(...data);
  }

  const values: any = [];

  for (let entry of result) {
    let field: any = await client.getDynamicFieldObject({
      parentId:
        "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0",
      name: entry.name,
    });
    // console.dir(field, {depth: 7});
    values.push(field.data?.content.fields);
  }
  // console.log(result);

  console.dir(values, { depth: 4 });
};

readDynamicFields();
