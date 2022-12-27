const { get } = require('../helper/http')
const { fixBalancesTokens } = require('../helper/tokenMapping');

let messinaTvls = [];
let messinaAssets = [];

const tokenChain = {
  ethereum: 2,
  algorand: 8
};

const endpoint = 'https://messina.one/api';

const fetchTvlDetails = async() => {
  if (!messinaTvls.length) {
    const response = await get(`${endpoint}/stats/tvl-details`);

    messinaTvls = [];

    response.forEach((r) => {
      messinaTvls.push(...r.assets);
    });
  }

  return messinaTvls;
}

const fetchAssets = async () => {
  if (!messinaAssets.length) {
    messinaAssets = await get(`${endpoint}/bridge/get-assets?cache=true`);
  }

  return messinaAssets;
}

const tvlAlgo = async () => await processTvl(tokenChain.algorand);

const tvlEth = async () => await processTvl(tokenChain.ethereum);

const processTvl = async (chain) => {
  let balances = {};

  messinaTvls = await fetchTvlDetails();
  messinaAssets = await fetchAssets();

  const filteredTvls = messinaTvls.filter(t => t.chainId == chain);
  
  filteredTvls.forEach(f => {
    const { id, amount }= f;

    if (chain == tokenChain.ethereum) {
      const decimals = messinaAssets.find(n => n.id == id)?.sourceDecimals || 1;

      balances[id] = amount * (10 ** decimals);
    } else {
      // get coingeckoId
      const { coingeckoId } = fixBalancesTokens.algorand[id];

      balances[coingeckoId] = amount;
    }
  });

  return balances;
}


module.exports = {
  ethereum: { tvl: tvlEth },
  algorand: { tvl: tvlAlgo }
}