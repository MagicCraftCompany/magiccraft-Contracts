import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const initBalance = 1000 * 1e9;
const prizeFeePercent = 10;

describe("Starting the test suite", () => {
  async function initFixture() {
    const [
      owner,
      alice,
      bob,
      johnny,
      jackie,
      joey,
      chloe,
      moe,
      treasury,
      fondWallet,
    ] = await ethers.getSigners();

    const MCRTToken = await ethers.getContractFactory("MCRTToken");
    const mcrt = await MCRTToken.deploy("MCRT", "MCRT", 9);

    const GameWallet = await ethers.getContractFactory("GameWallet");
    const gameWallet = await GameWallet.deploy();
    await gameWallet.initialize(mcrt.address);
    await gameWallet.setLockDuration(600);

    const people = {
      alice,
      bob,
      johnny,
      jackie,
      joey,
      chloe,
      moe,
      fondWallet,
    } as const;

    await mcrt.connect(owner).transfer(fondWallet.address, initBalance); // 1000 MCRT

    await Promise.all(
      Object.values(people).map((person) => {
        return mcrt.connect(owner).transfer(person.address, initBalance); // 1000 MCRT
      })
    );

    await gameWallet.setTreasury(treasury.address);
    await gameWallet.setPrizeFondWallet(fondWallet.address);
    await gameWallet.setPrizeFee(prizeFeePercent * 100);

    return {
      people,
      owner,
      treasury,
      mcrt,
      gameWallet,
      fondWallet,
    };
  }

  async function initFixtureWithBalanceInGameWallet() {
    const { owner, people, treasury, mcrt, gameWallet, fondWallet } =
      await initFixture();

    const balance = 1000000000000;

    await Promise.all(
      Object.values(people).map(async (person) => {
        await mcrt.connect(person).approve(gameWallet.address, initBalance);
        await gameWallet.connect(person).manageBalance(true, balance);
      })
    );

    return {
      ...people,
      owner,
      treasury,
      mcrt,
      gameWallet,
      fondWallet,
      balance,
    };
  }

  it("Test: Deposit", async function () {
    const {
      people: { alice, bob },
      mcrt,
      gameWallet,
    } = await initFixture();
    await mcrt.connect(alice).approve(gameWallet.address, initBalance);
    await mcrt.connect(bob).approve(gameWallet.address, initBalance);

    const toDeposit = 1000000000000;
    await gameWallet.connect(alice).manageBalance(true, toDeposit);
    await gameWallet.connect(bob).manageBalance(true, toDeposit);

    expect(await gameWallet.pBalance(alice.address)).to.eq(toDeposit) &&
      expect(await gameWallet.pBalance(bob.address)).to.eq(toDeposit);
  });

  it("Test: WinPrize from fond", async function () {
    const {
      alice,
      bob,
      johnny,
      treasury,
      gameWallet,
      owner,
      balance,
      fondWallet,
    } = await loadFixture(initFixtureWithBalanceInGameWallet);

    const aliceInitBalance = await gameWallet.pBalance(alice.address);

    const prizePool = 100 * 1e9;

    expect(await gameWallet.pBalance(fondWallet.address)).to.eq(
      balance,
      "Fond wallet has wrong balance at the beginning"
    );

    await gameWallet.connect(owner).winPrize(
      [
        { account: bob.address, winningPerMille: 0, isWinner: false },
        { account: alice.address, winningPerMille: 1000, isWinner: true },
        { account: johnny.address, winningPerMille: 0, isWinner: true },
      ],
      prizePool,
      true
    );

    const royalty = (prizePool * prizeFeePercent) / 100;

    expect(await gameWallet.pBalance(fondWallet.address)).to.eq(
      balance - prizePool,
      "Fond wallet has wrong balance"
    );

    expect(await gameWallet.pBalance(treasury.address)).to.eq(
      royalty,
      "Treasury has wrong balance"
    );

    const aliceFinalBalance = await gameWallet.pBalance(alice.address);

    expect(aliceFinalBalance).to.eq(
      aliceInitBalance.add(prizePool - royalty),
      "Alice has wrong balance"
    );

    expect(await gameWallet.pBalance(bob.address)).to.eq(
      balance,
      "Bob's balance is wrong"
    );
  });

  it("Test: WinPrize two players", async function () {
    const { alice, bob, johnny, treasury, gameWallet, owner, balance } =
      await loadFixture(initFixtureWithBalanceInGameWallet);

    const aliceInitBalance = await gameWallet.pBalance(alice.address);

    const entryFee = 100 * 1e9;

    await gameWallet.connect(owner).winPrize(
      [
        { account: bob.address, winningPerMille: 0, isWinner: false },
        { account: alice.address, winningPerMille: 1000, isWinner: true },
      ],
      entryFee * 2,
      false
    );

    const prizeFee = (entryFee * prizeFeePercent) / 100;
    const royalty = prizeFee;
    const winAmount = entryFee - prizeFee;

    expect(await gameWallet.pBalance(treasury.address)).to.eq(royalty);

    const aliceFinalBalance = await gameWallet.pBalance(alice.address);

    expect(aliceFinalBalance).to.eq(
      aliceInitBalance.add(winAmount),
      "Alice has wrong balance"
    );

    expect(await gameWallet.pBalance(bob.address)).to.eq(balance - entryFee);
  });

  it("Test: WinPrize even", async function () {
    const {
      alice,
      bob,
      jackie,
      joey,
      johnny,
      chloe,
      moe,
      treasury,
      gameWallet,
      owner,
      balance,
    } = await loadFixture(initFixtureWithBalanceInGameWallet);

    const aliceInitBalance = await gameWallet.pBalance(alice.address);
    const winners = [alice.address, bob.address, johnny.address, chloe.address];
    const losers = [jackie.address, joey.address, moe.address];
    const players = [...winners, ...losers];

    const entryFee = 100 * 1e9;

    const losersEntryFees = entryFee * losers.length;

    let winningPermilleLeft = 1000;
    const winnersPerMilles: number[] = [];

    await gameWallet.connect(owner).winPrize(
      players.map((account, i) => {
        let winningPerMille = Math.floor(1000 / winners.length);

        if (i === winners.length - 1) {
          winningPerMille = winningPermilleLeft;
        } else {
          winningPermilleLeft -= winningPerMille;
        }

        winnersPerMilles.push(winningPerMille);

        return {
          account,
          winningPerMille,
          isWinner: winners.includes(account),
        };
      }),
      entryFee * players.length,
      false
    );

    const _prizeFee = (entryFee * prizeFeePercent) / 100;
    const royaltyTotal = _prizeFee * losers.length;
    const prizePool = losersEntryFees - royaltyTotal;

    expect(await gameWallet.pBalance(treasury.address)).to.eq(royaltyTotal);

    const aliceFinalBalance = await gameWallet.pBalance(alice.address);

    expect(aliceFinalBalance).to.eq(
      aliceInitBalance.add(prizePool * (winnersPerMilles[0] / 1000)),
      "Alice has wrong balance"
    );

    for (let i = 0; i < winners.length; i++) {
      const winnerPerMille = winnersPerMilles[i];
      const wonAmount = prizePool * (winnerPerMille / 1000);
      expect(await gameWallet.pBalance(winners[i])).to.eq(
        balance + wonAmount,
        `Winner ${i} has wrong balance`
      );
    }

    for (const loser of losers) {
      expect(await gameWallet.pBalance(loser)).to.eq(
        balance - entryFee,
        `Loser ${loser} has wrong balance`
      );
    }
  });

  it("Test: Withdraw when locked", async function () {
    const { bob, gameWallet, owner } = await loadFixture(
      initFixtureWithBalanceInGameWallet
    );
    await gameWallet.connect(owner).lockAccounts([bob.address]);

    await expect(
      gameWallet.connect(bob).manageBalance(false, 0)
    ).to.be.revertedWith("Account locked for withdraw");
  });

  it("Test: Withdraw when balance is not enough", async function () {
    const { alice, mcrt, gameWallet, balance } = await loadFixture(
      initFixtureWithBalanceInGameWallet
    );
    await expect(
      gameWallet.connect(alice).manageBalance(false, balance + 1)
    ).to.be.revertedWith("Not enough token deposited");
  });

  it("Test: Withdraw", async function () {
    const { bob, balance, gameWallet } = await loadFixture(
      initFixtureWithBalanceInGameWallet
    );

    const toWithdraw = 1000000;
    await gameWallet.connect(bob).manageBalance(false, toWithdraw);

    expect(await gameWallet.pBalance(bob.address)).to.eq(balance - toWithdraw);
  });

  it("Test: Withdraw after locking period ends", async function () {
    const { bob, balance, gameWallet, owner } = await loadFixture(
      initFixtureWithBalanceInGameWallet
    );

    await gameWallet.connect(owner).lockAccounts([bob.address]);

    const toWithdraw = 1000000;

    await ethers.provider.send("evm_increaseTime", [610]);

    // Mine a new block to update the timestamp
    await ethers.provider.send("evm_mine", []);

    await gameWallet.connect(bob).manageBalance(false, toWithdraw);

    expect(await gameWallet.pBalance(bob.address)).to.eq(balance - toWithdraw);
  });

  it("Test: Owner deposit balance to a specified wallet", async function () {
    const { alice, bob, gameWallet, owner, balance, fondWallet } =
      await loadFixture(initFixtureWithBalanceInGameWallet);

    const prizeFondWalletInitBalance = await gameWallet.pBalance(
      fondWallet.address
    );

    const toDeposit = 1000000;
    await gameWallet.connect(owner).ownerDeposit(bob.address, toDeposit);

    const bobFinalBalance = await gameWallet.pBalance(bob.address);
    const prizeFondWalletFinalBalance = await gameWallet.pBalance(
      fondWallet.address
    );

    expect(bobFinalBalance).to.eq(balance + toDeposit, "Bob has wrong balance");
    expect(
      prizeFondWalletFinalBalance.eq(prizeFondWalletInitBalance.sub(toDeposit)),
      "Prize fond wallet has wrong balance"
    );

    await expect(
      gameWallet.connect(alice).ownerDeposit(bob.address, toDeposit)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
