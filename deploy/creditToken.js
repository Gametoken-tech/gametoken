const deployCredit = async function (hre) {
  const {
    deployments: { deploy },
    getNamedAccounts,
  } = hre;
  const { deployer, treasury } = await getNamedAccounts();
  const transferFeeRate = 100; // 1%
  await deploy('CreditToken', {
    from: deployer,
    args: [treasury, transferFeeRate],
    log: true,
  });
};

module.exports = deployCredit;
module.exports.tags = ['Credit'];
