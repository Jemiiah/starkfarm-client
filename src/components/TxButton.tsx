import CONSTANTS from '@/constants';
import { StrategyTxProps, monitorNewTxAtom } from '@/store/transactions.atom';
import { TokenInfo } from '@/strategies/IStrategy';
import {
  Box,
  Button,
  ButtonProps,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useAccount, useContractWrite } from '@starknet-react/core';
import { useSetAtom } from 'jotai';
import mixpanel from 'mixpanel-browser';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { isMobile } from 'react-device-detect';
import { TwitterShareButton } from 'react-share';
import { Call } from 'starknet';

interface TxButtonProps {
  txInfo: StrategyTxProps;
  buttonText?: 'Deposit' | 'Redeem';
  text: string;
  calls: Call[];
  buttonProps: ButtonProps;
  justDisableIfNoWalletConnect?: boolean;
  selectedMarket?: TokenInfo;
  strategyName?: string;
}

export default function TxButton(props: TxButtonProps) {
  const { address } = useAccount();
  const monitorNewTx = useSetAtom(monitorNewTxAtom);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const pathname = usePathname();

  const disabledStyle = {
    bg: 'var(--chakra-colors-disabled_bg)',
    color: 'var(--chakra-colors-disabled_text)',
    borderColor: 'var(--chakra-colors-disabled_bg)',
    borderWidth: '1px',
  };

  const { writeAsync, data, status, isSuccess, isPending, error, isError } =
    useContractWrite({
      calls: props.calls,
    });

  useEffect(() => {
    if (data && data.transaction_hash) {
      // initiates a toast and adds the tx to tx history if successful
      monitorNewTx({
        txHash: data.transaction_hash,
        info: props.txInfo,
        status: 'pending', // 'success' | 'failed'
        createdAt: new Date(),
      });
    }

    if (isSuccess && data && data.transaction_hash) {
      mixpanel.track('Transaction success', {
        strategyId: props.txInfo.strategyId,
        actionType: props.txInfo.actionType,
        amount: props.txInfo.amount.toEtherToFixedDecimals(6),
        tokenAddr: props.txInfo.tokenAddr,
        status: 'success',
        createdAt: new Date(),
      });
    }

    if (isError && error) {
      mixpanel.track('Transaction failed', {
        strategyId: props.txInfo.strategyId,
        actionType: props.txInfo.actionType,
        amount: props.txInfo.amount.toEtherToFixedDecimals(6),
        tokenAddr: props.txInfo.tokenAddr,
        status: 'failed',
        createdAt: new Date(),
      });
    }
  }, [status, data]);

  // useEffect(() => {
  //   console.log('TxButton props calls', props.calls);
  // }, [props])

  const disabledText = useMemo(() => {
    if (props.justDisableIfNoWalletConnect) {
      if (!address) return props.text;
      return '';
    }
    if (isMobile) return CONSTANTS.MOBILE_MSG;
    if (!address) return 'Wallet not connected';
    return '';
  }, [isMobile, address, props]);

  if (disabledText) {
    return (
      <Button
        _disabled={{
          ...disabledStyle,
        }}
        _hover={{
          ...disabledStyle,
        }}
        _active={{
          ...disabledStyle,
        }}
        isDisabled={true}
        width={'100%'}
        {...props.buttonProps}
      >
        {disabledText}
      </Button>
    );
  }

  return (
    <>
      <Modal onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius=".5rem" maxW="32rem">
          <ModalCloseButton color="white" />
          <ModalBody
            backgroundColor="#7E49E5"
            pt="4rem"
            pb="3rem"
            border="1px solid white"
            borderRadius=".5rem"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            gap="1rem"
          >
            <Text textAlign="center" fontSize="1.5rem" fontWeight="bold">
              Thank you for your deposit!
            </Text>

            <Text textAlign="center" fontWeight="500">
              While your deposit is being processed, if you like STRKFarm, do
              you mind sharing on X (Twitter)
            </Text>

            <Box
              bg="white"
              borderRadius=".5rem"
              px="1rem"
              py=".5rem"
              color="black"
              _hover={{
                opacity: 0.9,
              }}
              fontWeight="bold"
            >
              <TwitterShareButton
                url={`https://www.strkfarm.xyz${pathname}`}
                title={`I just invested my ${props.selectedMarket?.name ?? ''} token in ${props.strategyName ?? ''} in @strkfarm. \n\nHere's the strategy:`}
                related={['strkfarm']}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.6rem',
                }}
              >
                Share on
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  version="1.1"
                  id="Layer_1"
                  width="15px"
                  height="15px"
                  viewBox="0 0 24 24"
                  xmlSpace="preserve"
                >
                  <path
                    fill="#7E49E5"
                    d="M14.095479,10.316482L22.286354,1h-1.940718l-7.115352,8.087682L7.551414,1H1l8.589488,12.231093L1,23h1.940717  l7.509372-8.542861L16.448587,23H23L14.095479,10.316482z M11.436522,13.338465l-0.871624-1.218704l-6.924311-9.68815h2.981339  l5.58978,7.82155l0.867949,1.218704l7.26506,10.166271h-2.981339L11.436522,13.338465z"
                  />
                </svg>{' '}
              </TwitterShareButton>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Box width={'100%'} textAlign={'center'}>
        <Button
          color={'white'}
          bg="purple"
          variant={'ghost'}
          width={'100%'}
          _active={{
            bg: 'var(--chakra-colors-color2)',
          }}
          _hover={{
            bg: 'var(--chakra-colors-color2)',
          }}
          onClick={() => {
            mixpanel.track('Click strategy button', {
              strategyId: props.txInfo.strategyId,
              buttonText: props.text,
              address,
            });
            writeAsync().then((tx) => {
              if (props.buttonText === 'Deposit') onOpen();
              mixpanel.track('Submitted tx', {
                strategyId: props.txInfo.strategyId,
                txHash: tx.transaction_hash,
                address,
              });
            });
          }}
          {...props.buttonProps}
        >
          {isPending && <Spinner size={'sm'} marginRight={'5px'} />}{' '}
          {props.text}
        </Button>
      </Box>
    </>
  );
}
