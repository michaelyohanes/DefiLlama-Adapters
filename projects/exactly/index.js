const sdk = require('@defillama/sdk')

module.exports = {
  methodology:
    "Counts the tokens locked in the contracts to be used as collateral to borrow or to earn yield. Borrowed coins are not counted towards the TVL, so only the coins actually locked in the contracts are counted. There are multiple reasons behind this but one of the main ones is to avoid inflating the TVL through cycled lending.",
};

const config = {
  ethereum: {
    auditor: '0x310A2694521f75C7B2b64b5937C16CE65C3EFE01',
    startTimestamp: 1667223731,
  }
}

Object.keys(config).forEach(chain => {
  const { auditor, startTimestamp, } = config[chain]
  module.exports[chain] = {
    tvl: async (_, _b, _cb, { api, }) => {

      const balances = {}
      const data = await markets(api, auditor, startTimestamp)

      data[0].forEach((_, i) => {
        const asset = data[0][i]
        const totalAssets = data[1][i]
        const totalFloatingBorrowAssets = data[2][i]
        const fixedPools = data[4][i]

        sdk.util.sumSingleBalance(balances, asset, totalAssets, chain)
        sdk.util.sumSingleBalance(balances, asset, totalFloatingBorrowAssets * -1, chain)
        fixedPools.forEach(({ borrowed, supplied }) => {
          sdk.util.sumSingleBalance(balances, asset, supplied, chain)
          sdk.util.sumSingleBalance(balances, asset, borrowed * -1, chain)
        })
      })
      return balances
    },
    borrowed: async (_, _b, _cb, { api, }) => {

      const balances = {}
      const data = await markets(api, auditor, startTimestamp)

      data[0].forEach((_, i) => {
        const asset = data[0][i]
        const totalFloatingBorrowAssets = data[2][i]
        const fixedPools = data[4][i]

        sdk.util.sumSingleBalance(balances, asset, totalFloatingBorrowAssets, chain)
        fixedPools.forEach(({ borrowed }) => {
          sdk.util.sumSingleBalance(balances, asset, borrowed, chain)
        })
      })
      return balances
    },
  }
})

const INTERVAL = 86_400 * 7 * 4;

async function markets(api, target, startTimestamp) {
  const markets = await api.call({ abi: abis.allMarkets, target })
  const timestamp = api.timestamp

  const getters = [
    "asset",
    "totalAssets",
    "totalFloatingBorrowAssets",
    "maxFuturePools",
  ]
  const gettersData = await Promise.all(getters.map(key => api.multiCall({ abi: abis[key], calls: markets })))
  const params = []
  const futurePoolsMax = gettersData[3].reduce((a, i) => a > +i ? a : +i, 0)

  markets.forEach((_, i) => {
    params[i] = []
    const minMaturity = startTimestamp - (startTimestamp % INTERVAL) + INTERVAL;
    const maxMaturity = timestamp - (timestamp % INTERVAL) + INTERVAL * futurePoolsMax
    const fixedPoolCount = (maxMaturity - minMaturity) / INTERVAL + 1;

    for (let j = 0; j < fixedPoolCount; j++)
      params[i].push(minMaturity + INTERVAL * j)
  })

  const fixedPools = await Promise.all(markets.map((target, i) => api.multiCall({ target, abi: abis.fixedPools, calls: params[i]})))

  gettersData.push(fixedPools)
  return gettersData
}

const abis = {
  allMarkets: "function allMarkets() view returns (address[])",
  asset: "function asset() view returns (address)",
  fixedPools: "function fixedPools(uint256) view returns ((uint256 borrowed, uint256 supplied, uint256, uint256))",
  maxFuturePools: "function maxFuturePools() view returns (uint8)",
  totalAssets: "function totalAssets() view returns (uint256)",
  totalFloatingBorrowAssets: "function totalFloatingBorrowAssets() view returns (uint256)",
}