const { get } = require('../helper/http')
const { fixBalancesTokens } = require('../helper/tokenMapping');

const tokenDecimals = [
  {
    id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6
  },
  {
    id: '31566704',
    decimals: 6
  },
  {
    id: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8
  },
  {
    id: '386192725',
    decimals: 8
  },
  {
    id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    decimals: 18
  },
  {
    id: '386195940',
    decimals: 8
  }
];


async function fetchData(chain) {
  const url = 'https://messina.one/api/stats/tvl-details';
  const response = await get(url);
  const tvl = {};

  response.forEach((r) => {
    const { assets } = r;

    assets.forEach((asset) => {
      const { chainId, id, amount } = asset;
      let { decimals } = asset;
      
      if (chainId == chain) {
        if (chain == 2) {
          // if decimals not found on api response, then query from tokenDecimals
          if (!decimals) {
            decimals = tokenDecimals.find(n => n.id == id.toLowerCase())?.decimals || 1;
          }

          tvl[id] = amount * (10 ** decimals);
        } else {
          // get coingeckoId
          const { coingeckoId } = fixBalancesTokens.algorand[id];

          tvl[coingeckoId] = amount;
        }
      }
    })
  });

  return tvl;
}

async function tvlEth() {
  return await fetchData(2);
}


async function tvlAlgo() {
  return await fetchData(8);
}



module.exports = {
  start: 1665446400, // Oct 11, 2022 00:00:00 GMT as per messina bridge launch date
  ethereum: { tvl: tvlEth },
  algorand: { tvl: tvlAlgo}
}