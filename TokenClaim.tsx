import React from 'react'
import { useAccount } from 'wagmi'
import { formatEther, zeroAddress } from 'viem'

import { handleError, NumberFormatLimitedThreeSignificantDigits } from 'src/libs/helper'

import { useDistribution } from '../hooks/useDistribution'
import { useToken } from 'src/hooks/useToken'
import { useNFT } from 'src/pages/Marketplace/hooks/useNFT'
import { useDPFactory } from 'src/pages/Projects/hooks/useDPFactory'

import { Distribution } from 'src/configs/Contract'
import { defaultChain } from 'src/configs/WagmiConfig'
import { APP_CONSTANTS } from 'src/configs/Constant'

import { useLoading } from 'src/providers/LoadingProvider'

import { DeFiPoolDataType } from 'src/pages/Marketplace/types'

import BaseButton from 'src/components/buttons/BaseButton'
import useNotification from 'src/hooks/useNotification'

type Props = {
  pool: string | undefined
  onClick?: () => void
}

export const TokenClaim = ({ pool }: Props) => {
  const { address } = useAccount()
  const { setLoadingText } = useLoading()
  const notify = useNotification()

  const { tokenIdOfUser } = useNFT()
  const { readPoolData } = useDPFactory()
  const {
    getLpForFund,
    claimToken,
    isConfirmed,
    userClaimedAmount,
    fundsTokenTotalSupply,
    fundsToken,
    setFundsToken,
  } = useDistribution()
  const {
    getTokenSymbol,
    getTokenBalance,
    getTokenAllowance,
    callTokenApprove,
    isSuccess: isApprovedSuccess,
    transactionError: approveTransactionError,
  } = useToken()

  const [poolData, setPoolData] = React.useState<DeFiPoolDataType>()
  // const [fundsToken, setFundsToken] = React.useState<string>('')
  const [fundsTokenSymbol, setFundsTokenSymbol] = React.useState<string>('Token')
  // const [fundsTokenBalance, setFundsTokenBalance] = React.useState<number>(0)
  const [lpTokenBalance, setLpTokenBalance] = React.useState<number>(0)
  const [lpTokenAllowance, setLpTokenAllowance] = React.useState<number>(0)
  const [claimableTokenAmount, setClaimableTokenAmount] = React.useState<number>(0)

  // Event handlers
  const onChangeRadioInput = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    console.log(e.target.value)
  }, [])

  const handleSubmit = React.useCallback(() => {
    if (lpTokenAllowance >= lpTokenBalance) handleClaimToken()
    else handleApproveLpToken()
  }, [address, pool, poolData, lpTokenBalance, lpTokenAllowance])

  const handleApproveLpToken = React.useCallback(() => {
    if (poolData && poolData.lpToken) {
      if (lpTokenBalance > 0) {
        setLoadingText('Approving...')
        callTokenApprove(
          poolData.lpToken,
          Distribution.address[defaultChain.id],
          Number(formatEther(BigInt(lpTokenBalance))),
        )
          .then((res) => {
            console.log(res)
          })
          .catch((err) => {
            console.error(err)
            setLoadingText('')
          })
      } else {
        return notify('Insufficient lpToken balance', 'warning')
      }
    }
  }, [address, pool, poolData, lpTokenBalance, callTokenApprove])

  const handleClaimToken = React.useCallback(() => {
    console.log('lpToken', poolData, 'tokenIdofUser', tokenIdOfUser)
    if (poolData && poolData.lpToken && tokenIdOfUser && tokenIdOfUser > 0) {
      setLoadingText('Claiming...')
      claimToken(APP_CONSTANTS.dstEid, poolData.lpToken as `0x${string}`, tokenIdOfUser)
        ?.then((res) => {
          console.log(res)
        })
        .catch((err) => {
          console.error(err)
          notify('Failed to claim', 'error')
          setLoadingText('')
        })
    } else {
      notify('Select Project to claim', 'error')
    }
  }, [poolData, tokenIdOfUser])

  React.useEffect(() => {
    if (pool) {
      readPoolData(pool)
        .then((res) => {
          if (res) setPoolData(res)
        })
        .catch((err) => {
          console.error(err)
        })
    }
  }, [pool])

  React.useEffect(() => {
    if (address && poolData && poolData.lpToken) {
      // Getting funds token of LP token
      console.log('lpToken Address:', poolData.lpToken)
      getLpForFund(poolData.lpToken as `0x${string}`)
        .then((res) => {
          console.log('fundtoken', poolData.lpToken, res)
          if (res) setFundsToken(res as string)
        })
        .catch((err) => console.error(err))

      // Getting LP token balance
      getTokenBalance(poolData.lpToken, address)
        .then((res) => {
          if (res) setLpTokenBalance(res as number)
        })
        .catch((err) => console.error(err))

      getTokenAllowance(poolData.lpToken, address, Distribution.address[defaultChain.id])
        .then((res) => {
          if (res) setLpTokenAllowance(res as number)
        })
        .catch((err) => console.error(err))
    }
  }, [poolData, address])

  React.useEffect(() => {
    if (fundsToken && address && fundsToken !== zeroAddress) {
      // Getting funds token balance
      // getTokenBalance(fundsToken, Distribution.address[defaultChain.id])
      //   .then((res) => {
      //     if (res) setFundsTokenBalance(res as number)
      //     else setFundsTokenBalance(0)
      //   })
      //   .catch((err) => {
      //     console.error(err)
      //   })

      // Getting funds token symbol to display it
      getTokenSymbol(fundsToken)
        .then((res) => {
          console.log(res)
          if (res) setFundsTokenSymbol(res as string)
        })
        .catch((err) => {
          console.error(err)
        })
    }
  }, [fundsToken, address])

  React.useEffect(() => {
    // Estimating claimable funds token amount
    const numFundsTokenBalance = Number(fundsTokenTotalSupply)
    const numLpTokenBalance = Number(formatEther(BigInt(lpTokenBalance)))
    const claimableAmount = (numFundsTokenBalance * numLpTokenBalance) / 100

    setClaimableTokenAmount(claimableAmount)
  }, [lpTokenBalance, fundsTokenTotalSupply])

  React.useEffect(() => {
    if (isApprovedSuccess) {
      handleClaimToken()
    }
  }, [isApprovedSuccess])

  React.useEffect(() => {
    if (isConfirmed) setLoadingText('')
  }, [isConfirmed])

  React.useEffect(() => {
    const error = approveTransactionError
    if (error) {
      setLoadingText('')
      handleError(error, (errMsg: string) => {
        notify(errMsg, 'error')
      })
    }
  }, [approveTransactionError])

  return (
    <>
      <h3 className='mt-[100px] text-center lg:text-left text-[40px] lg:text-[50px]'>
        Total tokens
      </h3>
      <div className='mt-[56px] flex items-center max-w-[560px] flex-col sm:flex-row md:flex-col lg:flex-row'>
        {/* <div>
          <img
            className='scale-75 lg:scale-100 w-[290px] h-[302px]'
            src={remainderChartSrc}
            alt='remainder chart'
          />
        </div> */}
        <div className='grid grid-rows-4 gap-[30px] mt-5 sm:mt-0 md:mt-5 lg:mt-0 px-3'>
          <div className='flex items-center'>
            <input
              id='claimed'
              type='radio'
              name='claimed'
              value={100}
              className='w-[20px] h-[20px]'
              checked
              onChange={onChangeRadioInput}
            />
            <label htmlFor='claim_1' className='ml-[25px] ul-text'>
              Claimed:{' '}
              {NumberFormatLimitedThreeSignificantDigits(Number(formatEther(userClaimedAmount)))}{' '}
              {fundsTokenSymbol}
            </label>
          </div>
          <div className='flex items-center'>
            <input
              id='claimable'
              type='radio'
              name='claimable'
              value={100}
              className='w-[20px] h-[20px]'
              checked
              onChange={onChangeRadioInput}
            />
            <label htmlFor='claim_1' className='ml-[25px] ul-text'>
              Claimable:{' '}
              {NumberFormatLimitedThreeSignificantDigits(
                Number(formatEther(BigInt(claimableTokenAmount - Number(userClaimedAmount)))),
              )}{' '}
              {fundsTokenSymbol}
            </label>
          </div>
          <div className='flex justify-center'>
            <BaseButton className='w-[143px] h-[44px]' onClick={handleSubmit}>
              CLAIM
            </BaseButton>
          </div>
        </div>
      </div>
    </>
  )
}
