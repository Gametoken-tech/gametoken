const hre = require('hardhat');
const { BigNumber } = require('ethers');

const address = '0xeA6E64Cadc91b6307cC3fb6B71162783E36356b0';
const startTime = '1625764800';

async function main() {
  const GameToken = await hre.ethers.getContractFactory('GameToken');
  const gameToken = GameToken.attach("0xdC97423e9c6129640Fe72ca6909E8D032029C1e0");
  // console.log((await presale.startTime()).toString());
  // await gameToken.approve(address, "1000000000000000000000000000000")
  await gameToken.excludeFromFee(address);
  await gameToken.transfer(address, "100000000000000000000") // 100 GAME
  // await presale.scheduleStart(startTime);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
