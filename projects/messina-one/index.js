/*==================================================
  Modules
  ==================================================*/

const sdk = require('@defillama/sdk');
const { getAppGlobalState } = require("../helper/chain/algorand")

/*==================================================
 Vars
 ==================================================*/

const listEthTokens = [
  {
    token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',    // USDC
    escrow: '0x8B1AA5cc114b20928734D6BFe47F876DFCfD36dD'
  },
  {
    token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',    // WBTC
    escrow: '0x3F3B7F62BF8a119ecA3f1Bff0d2a946BF331de89'
  },
  {
    token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',    // WETH
    escrow: '0xd3c09c07eD5371ca76511ad1ff4Cf357d7dBC108'
  }
];

const listAlgoTokens = [
  {
    escrowId: '900381763',
    coingecko: 'gobtc'
  },
  {
    escrowId: '896057431',
    coingecko: 'usd-coin'
  },
  {
    escrowId: '900398301',
    coingecko: 'goeth'
  }
];

/*==================================================
  TVL
  ==================================================*/

async function tvlEth(timestamp, block) {
  let balances = {};

  let calls = [];
  listEthTokens.forEach((tokenData) => {
    calls.push({
      target: tokenData.token,
      params: tokenData.escrow
    });
  });

  let balanceOfResults = await sdk.api.abi.multiCall({
    block,
    calls,
    abi: 'erc20:balanceOf'
  });
  sdk.util.sumMultiBalanceOf(balances, balanceOfResults, true);

  return balances;
}


async function tvlAlgo() {
  let promises = [];
  let balances = {};

  listAlgoTokens.forEach((tokenData) => {
    promises.push(getAppGlobalState(tokenData.escrowId));
  });

  const results = await Promise.all(promises);

  results.forEach((result, idx) => {
    const total = (result.ain - result.aout) / 1e6; // amount in - amount out

    sdk.util.sumSingleBalance(balances, listAlgoTokens[idx].coingecko , total);
  });
  
  return balances;
}

/*==================================================
  Exports
  ==================================================*/

module.exports = {
  start: 1665446400, // Oct 11, 2022 00:00:00 GMT
  ethereum: { tvl: tvlEth },
  algorand: { tvl: tvlAlgo}
}