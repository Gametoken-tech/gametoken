const { ethers } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { constants } = require('@openzeppelin/test-helpers');

describe('CreditToken', () => {
  let owner;
  let alice;
  let bob;
  let carol;
  let treasury;
  let transferFeeRate = BigNumber.from('100'); // 1%
  let creditToken;
  const DENOMINATOR = BigNumber.from('10000');
  const NAME = 'CreditToken';
  const SYMBOL = 'CREDIT';
  const DECIMALS = 18;
  const decimalsUnit = BigNumber.from('10').pow(
    BigNumber.from(DECIMALS.toString()),
  );
  const TOTAL_SUPPLY = BigNumber.from('1000000000000000000').mul(decimalsUnit);

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [owner, alice, bob, carol, treasury] = accounts;
    const CreditToken = await ethers.getContractFactory('CreditToken');
    creditToken = await CreditToken.deploy(treasury.address, transferFeeRate);
  });

  describe('constructor', () => {
    it('Revert if treasury is zero', async () => {
      const CreditToken = await ethers.getContractFactory('CreditToken');
      await expect(
        CreditToken.deploy(constants.ZERO_ADDRESS, transferFeeRate),
      ).to.be.revertedWith('CREDITTOKEN: treasury cannot be zero');
    });

    it('Revert if transfer fee rate is greater than 100%', async () => {
      const CreditToken = await ethers.getContractFactory('CreditToken');
      await expect(
        CreditToken.deploy(
          treasury.address,
          DENOMINATOR.add(BigNumber.from('1')),
        ),
      ).to.be.revertedWith(
        'CREDITTOKEN: transfer fee rate can not be greater than 100%',
      );
    });
  });

  describe('Check token metadata', () => {
    it('Check name', async () => {
      expect(await creditToken.name()).to.equal(NAME);
    });

    it('Check symbol', async () => {
      expect(await creditToken.symbol()).to.equal(SYMBOL);
    });

    it('Check decimals', async () => {
      expect(await creditToken.decimals()).to.equal(DECIMALS);
    });

    it('Check total supply', async () => {
      expect(await creditToken.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('Check owner balance', async () => {
      expect(await creditToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
    });

    it('Check treasury', async () => {
      expect(await creditToken.treasury()).to.equal(treasury.address);
    });

    it('Check transfer fee rate', async () => {
      expect(await creditToken.transferFeeRate()).to.equal(transferFeeRate);
    });

    it('Check owner', async () => {
      expect(await creditToken.owner()).to.equal(owner.address);
    });
  });

  describe('excludeFromFee', () => {
    it('Revert if msg.sender is not owner', async () => {
      await expect(
        creditToken.connect(alice).excludeFromFee(carol.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Exclude from fee and emit ExcludedFromFee event', async () => {
      expect(await creditToken.excludedFromFee(carol.address)).to.equal(false);
      const tx = await creditToken.connect(owner).excludeFromFee(carol.address);
      expect(await creditToken.excludedFromFee(carol.address)).to.equal(true);
      expect(tx)
        .to.emit(creditToken, 'ExcludedFromFee')
        .withArgs(carol.address);
    });

    it('Revert to exclude twice', async () => {
      await creditToken.connect(owner).excludeFromFee(carol.address);
      await expect(
        creditToken.connect(owner).excludeFromFee(carol.address),
      ).to.be.revertedWith('CREDITTOKEN: already excluded');
    });
  });

  describe('includeForFee', () => {
    beforeEach(async () => {
      await creditToken.connect(owner).excludeFromFee(carol.address);
    });

    it('Revert if msg.sender is not owner', async () => {
      await expect(
        creditToken.connect(alice).includeForFee(carol.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Exclude from fee and emit IncludedForFee event', async () => {
      expect(await creditToken.excludedFromFee(carol.address)).to.equal(true);
      const tx = await creditToken.connect(owner).includeForFee(carol.address);
      expect(await creditToken.excludedFromFee(carol.address)).to.equal(false);
      expect(tx).to.emit(creditToken, 'IncludedForFee').withArgs(carol.address);
    });

    it('Revert to include twice', async () => {
      await creditToken.connect(owner).includeForFee(carol.address);
      await expect(
        creditToken.connect(owner).includeForFee(carol.address),
      ).to.be.revertedWith('CREDITTOKEN: not excluded');

      await expect(
        creditToken.connect(owner).includeForFee(alice.address),
      ).to.be.revertedWith('CREDITTOKEN: not excluded');
    });
  });

  describe('setTransferFeeRate', () => {
    const newTransferRate = BigNumber.from('10');

    it('Revert if msg.sender is not owner', async () => {
      await expect(
        creditToken.connect(alice).setTransferFeeRate(newTransferRate),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Revert if transfer fee rate is greater than 100%', async () => {
      await expect(
        creditToken
          .connect(owner)
          .setTransferFeeRate(DENOMINATOR.add(BigNumber.from('1'))),
      ).to.be.revertedWith(
        'CREDITTOKEN: transfer fee rate can not be greater than 100%',
      );
    });

    it('Set transfer fee rate and emit TransferFeeRateUpdated event', async () => {
      const tx = await creditToken
        .connect(owner)
        .setTransferFeeRate(newTransferRate);
      expect(await creditToken.transferFeeRate()).to.equal(newTransferRate);
      expect(tx)
        .to.emit(creditToken, 'TransferFeeRateUpdated')
        .withArgs(newTransferRate);
    });
  });

  describe('setTreasury', () => {
    it('Revert if msg.sender is not owner', async () => {
      await expect(
        creditToken.connect(alice).setTreasury(bob.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Revert if treasury is zero', async () => {
      await expect(
        creditToken.connect(owner).setTreasury(constants.ZERO_ADDRESS),
      ).to.be.revertedWith('CREDITTOKEN: treasury cannot be zero');
    });

    it('Set treasury and emit TreasuryUpdated event', async () => {
      const tx = await creditToken.connect(owner).setTreasury(bob.address);
      expect(await creditToken.treasury()).to.equal(bob.address);
      expect(tx).to.emit(creditToken, 'TreasuryUpdated').withArgs(bob.address);
    });
  });

  describe('transfer', () => {
    it('Revert if recipient is zero', async () => {
      await expect(
        creditToken
          .connect(owner)
          .transfer(constants.ZERO_ADDRESS, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer to the zero address');
    });

    it('Revert if insufficient balance in msg.sender', async () => {
      await expect(
        creditToken.connect(alice).transfer(carol.address, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await creditToken.connect(owner).transfer(alice.address, '10000000000');

      await expect(
        creditToken.connect(alice).transfer(carol.address, '100000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('Transfer CREDIT token and emit Transfer events', async () => {
      const transferAmount1 = BigNumber.from('10000').mul(decimalsUnit);

      const tx1 = await creditToken
        .connect(owner)
        .transfer(alice.address, transferAmount1);

      const transferFee1 = transferAmount1
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount1 = transferAmount1.sub(transferFee1);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        transferFee1,
      );
      expect(await creditToken.balanceOf(owner.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1),
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        receivedAmount1,
      );
      expect(tx1)
        .to.emit(creditToken, 'Transfer')
        .withArgs(owner.address, treasury.address, transferFee1)
        .to.emit(creditToken, 'Transfer')
        .withArgs(owner.address, alice.address, receivedAmount1);

      const transferAmount2 = BigNumber.from('1000').mul(decimalsUnit);

      const tx2 = await creditToken
        .connect(alice)
        .transfer(carol.address, transferAmount2);

      const transferFee2 = transferAmount2
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount2 = transferAmount2.sub(transferFee2);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        transferFee1.add(transferFee2),
      );
      expect(await creditToken.balanceOf(owner.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1),
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        receivedAmount1.sub(transferAmount2),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        receivedAmount2,
      );
      expect(tx2)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, treasury.address, transferFee2)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, receivedAmount2);
    });

    it('Transfer CREDIT token without fee if sender is excluded from fee', async () => {
      await creditToken
        .connect(owner)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await creditToken.connect(owner).excludeFromFee(alice.address);
      const tx = await creditToken
        .connect(alice)
        .transfer(carol.address, transferAmount);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        transferAmount,
      );
      expect(tx)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer CREDIT token without fee if recipient is excluded from fee', async () => {
      await creditToken
        .connect(owner)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await creditToken.connect(owner).excludeFromFee(carol.address);
      const tx = await creditToken
        .connect(alice)
        .transfer(carol.address, transferAmount);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        transferAmount,
      );
      expect(tx)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer CREDIT token without fee if fee rate is zero', async () => {
      await creditToken
        .connect(owner)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await creditToken.connect(owner).setTransferFeeRate('0');
      const tx = await creditToken
        .connect(alice)
        .transfer(carol.address, transferAmount);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        transferAmount,
      );
      expect(tx)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });
  });

  describe('transferFrom', () => {
    it('Revert if recipient is zero', async () => {
      await expect(
        creditToken
          .connect(alice)
          .transferFrom(owner.address, constants.ZERO_ADDRESS, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer to the zero address');
    });

    it('Revert if sender is zero', async () => {
      await expect(
        creditToken
          .connect(alice)
          .transferFrom(constants.ZERO_ADDRESS, carol.address, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer from the zero address');
    });

    it('Revert if insufficient balance in sender', async () => {
      await creditToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);
      await expect(
        creditToken
          .connect(bob)
          .transferFrom(alice.address, carol.address, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await creditToken.connect(owner).transfer(alice.address, '10000000000');

      await expect(
        creditToken
          .connect(bob)
          .transferFrom(alice.address, carol.address, '100000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('Revert if insufficient allowance to spender', async () => {
      await creditToken.connect(alice).approve(bob.address, '10000000000');

      await creditToken.connect(owner).transfer(alice.address, '1000000000000');

      await expect(
        creditToken
          .connect(bob)
          .transferFrom(alice.address, carol.address, '100000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
    });

    it('Transfer CREDIT token and emit Transfer events', async () => {
      await creditToken.connect(owner).approve(bob.address, TOTAL_SUPPLY);
      const transferAmount1 = BigNumber.from('10000').mul(decimalsUnit);

      const tx1 = await creditToken
        .connect(bob)
        .transferFrom(owner.address, alice.address, transferAmount1);

      const transferFee1 = transferAmount1
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount1 = transferAmount1.sub(transferFee1);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        transferFee1,
      );
      expect(await creditToken.balanceOf(owner.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1),
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        receivedAmount1,
      );
      expect(await creditToken.allowance(owner.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1),
      );
      expect(tx1)
        .to.emit(creditToken, 'Transfer')
        .withArgs(owner.address, treasury.address, transferFee1)
        .to.emit(creditToken, 'Transfer')
        .withArgs(owner.address, alice.address, receivedAmount1);

      await creditToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const transferAmount2 = BigNumber.from('1000').mul(decimalsUnit);

      const tx2 = await creditToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount2);

      const transferFee2 = transferAmount2
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount2 = transferAmount2.sub(transferFee2);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        transferFee1.add(transferFee2),
      );
      expect(await creditToken.balanceOf(owner.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1),
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        receivedAmount1.sub(transferAmount2),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        receivedAmount2,
      );
      expect(await creditToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount2),
      );
      expect(tx2)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, treasury.address, transferFee2)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, receivedAmount2);
    });

    it('Transfer CREDIT token without fee if sender is excluded from fee', async () => {
      await creditToken
        .connect(owner)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await creditToken.connect(owner).excludeFromFee(alice.address);

      await creditToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const tx = await creditToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        transferAmount,
      );
      expect(await creditToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount),
      );
      expect(tx)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer CREDIT token without fee if recipient is excluded from fee', async () => {
      await creditToken
        .connect(owner)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await creditToken.connect(owner).excludeFromFee(carol.address);

      await creditToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const tx = await creditToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        transferAmount,
      );
      expect(await creditToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount),
      );
      expect(tx)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer CREDIT token without fee if fee rate is zero', async () => {
      await creditToken
        .connect(owner)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await creditToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await creditToken.connect(owner).setTransferFeeRate('0');

      await creditToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const tx = await creditToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount);

      expect(await creditToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await creditToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await creditToken.balanceOf(carol.address)).to.equal(
        transferAmount,
      );
      expect(await creditToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount),
      );
      expect(tx)
        .to.emit(creditToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });
  });
});
