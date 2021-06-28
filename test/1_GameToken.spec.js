const { ethers } = require('hardhat');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { constants } = require('@openzeppelin/test-helpers');

describe('GameToken', () => {
  let owner;
  let alice;
  let bob;
  let carol;
  let treasury;
  let transferFeeRate = BigNumber.from('100'); // 1%
  let gameToken;
  const DENOMINATOR = BigNumber.from('10000');
  const NAME = 'GameToken';
  const SYMBOL = 'GAME';
  const DECIMALS = 18;
  const decimalsUnit = BigNumber.from('10').pow(
    BigNumber.from(DECIMALS.toString()),
  );
  const TOTAL_SUPPLY = BigNumber.from('16000000').mul(decimalsUnit);

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [owner, alice, bob, carol, treasury] = accounts;
    const GameToken = await ethers.getContractFactory('GameToken');
    gameToken = await GameToken.deploy(treasury.address, transferFeeRate);
  });

  describe('constructor', () => {
    it('Revert if treasury is zero', async () => {
      const GameToken = await ethers.getContractFactory('GameToken');
      await expect(
        GameToken.deploy(constants.ZERO_ADDRESS, transferFeeRate),
      ).to.be.revertedWith('GAMETOKEN: treasury cannot be zero');
    });

    it('Revert if transfer fee rate is greater than 100%', async () => {
      const GameToken = await ethers.getContractFactory('GameToken');
      await expect(
        GameToken.deploy(
          treasury.address,
          DENOMINATOR.add(BigNumber.from('1')),
        ),
      ).to.be.revertedWith(
        'GAMETOKEN: transfer fee rate can not be greater than 100%',
      );
    });
  });

  describe('Check token metadata', () => {
    it('Check name', async () => {
      expect(await gameToken.name()).to.equal(NAME);
    });

    it('Check symbol', async () => {
      expect(await gameToken.symbol()).to.equal(SYMBOL);
    });

    it('Check decimals', async () => {
      expect(await gameToken.decimals()).to.equal(DECIMALS);
    });

    it('Check total supply', async () => {
      expect(await gameToken.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('Check treasury balance', async () => {
      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        TOTAL_SUPPLY,
      );
    });

    it('Check treasury', async () => {
      expect(await gameToken.treasury()).to.equal(treasury.address);
    });

    it('Check transfer fee rate', async () => {
      expect(await gameToken.transferFeeRate()).to.equal(transferFeeRate);
    });

    it('Check owner', async () => {
      expect(await gameToken.owner()).to.equal(owner.address);
    });
  });

  describe('excludeFromFee', () => {
    it('Revert if msg.sender is not owner', async () => {
      await expect(
        gameToken.connect(alice).excludeFromFee(carol.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Exclude from fee and emit ExcludedFromFee event', async () => {
      expect(await gameToken.excludedFromFee(carol.address)).to.equal(false);
      const tx = await gameToken.connect(owner).excludeFromFee(carol.address);
      expect(await gameToken.excludedFromFee(carol.address)).to.equal(true);
      expect(tx).to.emit(gameToken, 'ExcludedFromFee').withArgs(carol.address);
    });

    it('Revert to exclude twice', async () => {
      await gameToken.connect(owner).excludeFromFee(carol.address);
      await expect(
        gameToken.connect(owner).excludeFromFee(carol.address),
      ).to.be.revertedWith('GAMETOKEN: already excluded');
    });
  });

  describe('includeForFee', () => {
    beforeEach(async () => {
      await gameToken.connect(owner).excludeFromFee(carol.address);
    });

    it('Revert if msg.sender is not owner', async () => {
      await expect(
        gameToken.connect(alice).includeForFee(carol.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Exclude from fee and emit IncludedForFee event', async () => {
      expect(await gameToken.excludedFromFee(carol.address)).to.equal(true);
      const tx = await gameToken.connect(owner).includeForFee(carol.address);
      expect(await gameToken.excludedFromFee(carol.address)).to.equal(false);
      expect(tx).to.emit(gameToken, 'IncludedForFee').withArgs(carol.address);
    });

    it('Revert to include twice', async () => {
      await gameToken.connect(owner).includeForFee(carol.address);
      await expect(
        gameToken.connect(owner).includeForFee(carol.address),
      ).to.be.revertedWith('GAMETOKEN: not excluded');

      await expect(
        gameToken.connect(owner).includeForFee(alice.address),
      ).to.be.revertedWith('GAMETOKEN: not excluded');
    });
  });

  describe('setTransferFeeRate', () => {
    const newTransferRate = BigNumber.from('10');

    it('Revert if msg.sender is not owner', async () => {
      await expect(
        gameToken.connect(alice).setTransferFeeRate(newTransferRate),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Revert if transfer fee rate is greater than 100%', async () => {
      await expect(
        gameToken
          .connect(owner)
          .setTransferFeeRate(DENOMINATOR.add(BigNumber.from('1'))),
      ).to.be.revertedWith(
        'GAMETOKEN: transfer fee rate can not be greater than 100%',
      );
    });

    it('Set transfer fee rate and emit TransferFeeRateUpdated event', async () => {
      const tx = await gameToken
        .connect(owner)
        .setTransferFeeRate(newTransferRate);
      expect(await gameToken.transferFeeRate()).to.equal(newTransferRate);
      expect(tx)
        .to.emit(gameToken, 'TransferFeeRateUpdated')
        .withArgs(newTransferRate);
    });
  });

  describe('setTreasury', () => {
    it('Revert if msg.sender is not owner', async () => {
      await expect(
        gameToken.connect(alice).setTreasury(bob.address),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Revert if treasury is zero', async () => {
      await expect(
        gameToken.connect(owner).setTreasury(constants.ZERO_ADDRESS),
      ).to.be.revertedWith('GAMETOKEN: treasury cannot be zero');
    });

    it('Set treasury and emit TreasuryUpdated event', async () => {
      const tx = await gameToken.connect(owner).setTreasury(bob.address);
      expect(await gameToken.treasury()).to.equal(bob.address);
      expect(tx).to.emit(gameToken, 'TreasuryUpdated').withArgs(bob.address);
    });
  });

  describe('transfer', () => {
    it('Revert if recipient is zero', async () => {
      await expect(
        gameToken
          .connect(treasury)
          .transfer(constants.ZERO_ADDRESS, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer to the zero address');
    });

    it('Revert if insufficient balance in msg.sender', async () => {
      await expect(
        gameToken.connect(alice).transfer(carol.address, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await gameToken.connect(treasury).transfer(alice.address, '10000000000');

      await expect(
        gameToken.connect(alice).transfer(carol.address, '100000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('Transfer GAME token and emit Transfer events', async () => {
      const transferAmount1 = BigNumber.from('10000').mul(decimalsUnit);

      const tx1 = await gameToken
        .connect(treasury)
        .transfer(alice.address, transferAmount1);

      const transferFee1 = transferAmount1
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount1 = transferAmount1.sub(transferFee1);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1).add(transferFee1),
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        receivedAmount1,
      );
      expect(tx1)
        .to.emit(gameToken, 'Transfer')
        .withArgs(treasury.address, treasury.address, transferFee1)
        .to.emit(gameToken, 'Transfer')
        .withArgs(treasury.address, alice.address, receivedAmount1);

      const transferAmount2 = BigNumber.from('1000').mul(decimalsUnit);

      const tx2 = await gameToken
        .connect(alice)
        .transfer(carol.address, transferAmount2);

      const transferFee2 = transferAmount2
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount2 = transferAmount2.sub(transferFee2);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1).add(transferFee1).add(transferFee2),
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        receivedAmount1.sub(transferAmount2),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(
        receivedAmount2,
      );
      expect(tx2)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, treasury.address, transferFee2)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, receivedAmount2);
    });

    it('Transfer GAME token without fee if sender is excluded from fee', async () => {
      await gameToken
        .connect(treasury)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await gameToken.connect(owner).excludeFromFee(alice.address);
      const tx = await gameToken
        .connect(alice)
        .transfer(carol.address, transferAmount);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(transferAmount);
      expect(tx)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer GAME token without fee if recipient is excluded from fee', async () => {
      await gameToken
        .connect(treasury)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await gameToken.connect(owner).excludeFromFee(carol.address);
      const tx = await gameToken
        .connect(alice)
        .transfer(carol.address, transferAmount);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(transferAmount);
      expect(tx)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer GAME token without fee if fee rate is zero', async () => {
      await gameToken
        .connect(treasury)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await gameToken.connect(owner).setTransferFeeRate('0');
      const tx = await gameToken
        .connect(alice)
        .transfer(carol.address, transferAmount);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(transferAmount);
      expect(tx)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });
  });

  describe('transferFrom', () => {
    it('Revert if recipient is zero', async () => {
      await expect(
        gameToken
          .connect(alice)
          .transferFrom(
            treasury.address,
            constants.ZERO_ADDRESS,
            '10000000000',
          ),
      ).to.be.revertedWith('ERC20: transfer to the zero address');
    });

    it('Revert if sender is zero', async () => {
      await expect(
        gameToken
          .connect(alice)
          .transferFrom(constants.ZERO_ADDRESS, carol.address, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer from the zero address');
    });

    it('Revert if insufficient balance in sender', async () => {
      await gameToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);
      await expect(
        gameToken
          .connect(bob)
          .transferFrom(alice.address, carol.address, '10000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await gameToken.connect(treasury).transfer(alice.address, '10000000000');

      await expect(
        gameToken
          .connect(bob)
          .transferFrom(alice.address, carol.address, '100000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('Revert if insufficient allowance to spender', async () => {
      await gameToken.connect(alice).approve(bob.address, '10000000000');

      await gameToken
        .connect(treasury)
        .transfer(alice.address, '1000000000000');

      await expect(
        gameToken
          .connect(bob)
          .transferFrom(alice.address, carol.address, '100000000000'),
      ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
    });

    it('Transfer GAME token and emit Transfer events', async () => {
      await gameToken.connect(treasury).approve(bob.address, TOTAL_SUPPLY);
      const transferAmount1 = BigNumber.from('10000').mul(decimalsUnit);

      const tx1 = await gameToken
        .connect(bob)
        .transferFrom(treasury.address, alice.address, transferAmount1);

      const transferFee1 = transferAmount1
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount1 = transferAmount1.sub(transferFee1);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1).add(transferFee1),
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        receivedAmount1,
      );
      expect(await gameToken.allowance(treasury.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1),
      );
      expect(tx1)
        .to.emit(gameToken, 'Transfer')
        .withArgs(treasury.address, treasury.address, transferFee1)
        .to.emit(gameToken, 'Transfer')
        .withArgs(treasury.address, alice.address, receivedAmount1);

      await gameToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const transferAmount2 = BigNumber.from('1000').mul(decimalsUnit);

      const tx2 = await gameToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount2);

      const transferFee2 = transferAmount2
        .mul(transferFeeRate)
        .div(DENOMINATOR);
      const receivedAmount2 = transferAmount2.sub(transferFee2);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount1).add(transferFee1).add(transferFee2),
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        receivedAmount1.sub(transferAmount2),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(
        receivedAmount2,
      );
      expect(await gameToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount2),
      );
      expect(tx2)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, treasury.address, transferFee2)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, receivedAmount2);
    });

    it('Transfer GAME token without fee if sender is excluded from fee', async () => {
      await gameToken
        .connect(treasury)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await gameToken.connect(owner).excludeFromFee(alice.address);

      await gameToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const tx = await gameToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(transferAmount);
      expect(await gameToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount),
      );
      expect(tx)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer GAME token without fee if recipient is excluded from fee', async () => {
      await gameToken
        .connect(treasury)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await gameToken.connect(owner).excludeFromFee(carol.address);

      await gameToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const tx = await gameToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(transferAmount);
      expect(await gameToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount),
      );
      expect(tx)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });

    it('Transfer GAME token without fee if fee rate is zero', async () => {
      await gameToken
        .connect(treasury)
        .transfer(alice.address, BigNumber.from('10000').mul(decimalsUnit));

      const aliceBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(alice.address),
      );
      const treasuryBalanceBefore = BigNumber.from(
        await gameToken.balanceOf(treasury.address),
      );

      const transferAmount = BigNumber.from('1000').mul(decimalsUnit);

      await gameToken.connect(owner).setTransferFeeRate('0');

      await gameToken.connect(alice).approve(bob.address, TOTAL_SUPPLY);

      const tx = await gameToken
        .connect(bob)
        .transferFrom(alice.address, carol.address, transferAmount);

      expect(await gameToken.balanceOf(treasury.address)).to.equal(
        treasuryBalanceBefore,
      );
      expect(await gameToken.balanceOf(alice.address)).to.equal(
        aliceBalanceBefore.sub(transferAmount),
      );
      expect(await gameToken.balanceOf(carol.address)).to.equal(transferAmount);
      expect(await gameToken.allowance(alice.address, bob.address)).to.equal(
        TOTAL_SUPPLY.sub(transferAmount),
      );
      expect(tx)
        .to.emit(gameToken, 'Transfer')
        .withArgs(alice.address, carol.address, transferAmount);
    });
  });
});
