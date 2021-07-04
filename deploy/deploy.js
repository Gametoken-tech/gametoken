const deployGame = async function (hre) {
  const {
    deployments: { deploy },
    getNamedAccounts,
  } = hre;
  const { deployer, treasury } = await getNamedAccounts();
  const transferFeeRate = 100; // 1%
  await deploy('GameToken', {
    from: deployer,
    args: [treasury, transferFeeRate],
    log: true,
  });
};

module.exports = deployGame;
