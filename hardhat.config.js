require('@nomiclabs/hardhat-waffle');
require('hardhat-deploy');
require('solidity-coverage');
require('dotenv').config();

module.exports = {
  networks: {
    hardhat: {
      gas: 10000000,
      accounts: {
        accountsBalance: '100000000000000000000000000',
      },
      allowUnlimitedContractSize: true,
      timeout: 1000000,
    },
    mainnet: {
      url: 'https://api.harmony.one',
      chainId: 1666600000,
      accounts: [process.env.MAINNET_PRIVATE_KEY],
    },
    testnet: {
      url: 'https://api.s0.b.hmny.io',
      chainId: 1666700000,
      accounts: [process.env.TESTNET_PRIVATE_KEY],
    },
  },
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
    treasury: {
      1666600000: '0x4cb34d5489Ed8c46Ee204527B6a89e39A04923C6', // Harmony address: one1fje564yfakxydm3qg5nmd2y78xsyjg7xj2ldxe
      1666700000: '0x7638Ae4db07cb6e00b8952b238062D6c19b7830c',
    },
  },
};
