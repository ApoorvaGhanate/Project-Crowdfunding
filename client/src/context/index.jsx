import React, { useContext, createContext } from 'react';
import { 
  useAddress, 
  useContract, 
  useContractWrite, 
  useConnect,
  metamaskWallet
} from '@thirdweb-dev/react';
import { ethers } from 'ethers';

const StateContext = createContext();

const CONTRACT_ADDRESS = '0x213f42961f20e9febBD3c8a2Cd580e82819EDAb8';

const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "name": "campaigns",
    "outputs": [
      {"internalType": "address","name": "owner","type": "address"},
      {"internalType": "string","name": "title","type": "string"},
      {"internalType": "string","name": "description","type": "string"},
      {"internalType": "uint256","name": "target","type": "uint256"},
      {"internalType": "uint256","name": "deadline","type": "uint256"},
      {"internalType": "uint256","name": "amountCollected","type": "uint256"},
      {"internalType": "string","name": "image","type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address","name": "_owner","type": "address"},
      {"internalType": "string","name": "_title","type": "string"},
      {"internalType": "string","name": "_description","type": "string"},
      {"internalType": "uint256","name": "_target","type": "uint256"},
      {"internalType": "uint256","name": "_deadline","type": "uint256"},
      {"internalType": "string","name": "_image","type": "string"}
    ],
    "name": "createCampaign",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_id","type": "uint256"}],
    "name": "donateToCampaign",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCampaigns",
    "outputs": [
      {
        "components": [
          {"internalType": "address","name": "owner","type": "address"},
          {"internalType": "string","name": "title","type": "string"},
          {"internalType": "string","name": "description","type": "string"},
          {"internalType": "uint256","name": "target","type": "uint256"},
          {"internalType": "uint256","name": "deadline","type": "uint256"},
          {"internalType": "uint256","name": "amountCollected","type": "uint256"},
          {"internalType": "string","name": "image","type": "string"},
          {"internalType": "address[]","name": "donators","type": "address[]"},
          {"internalType": "uint256[]","name": "donations","type": "uint256[]"}
        ],
        "internalType": "struct CrowdFunding.Campaign[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256","name": "_id","type": "uint256"}],
    "name": "getDonators",
    "outputs": [
      {"internalType": "address[]","name": "","type": "address[]"},
      {"internalType": "uint256[]","name": "","type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "numberOfCampaigns",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export const StateContextProvider = ({ children }) => {
  const { contract } = useContract(CONTRACT_ADDRESS, CONTRACT_ABI);
  console.log("Contract loaded:", contract);
  const { mutateAsync: createCampaign } = useContractWrite(contract, 'createCampaign');

  const address = useAddress();
  const connect = useConnect();
  const metamaskConfig = metamaskWallet();

  const connectWallet = async () => {
    try {
      await connect(metamaskConfig);
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  }

  const publishCampaign = async (form) => {
    if(!contract) {
      console.error("Contract not loaded!");
      return;
    }
    try {
      const data = await createCampaign({
        args: [
          address,
          form.title,
          form.description,
          form.target,
          new Date(form.deadline).getTime(),
          form.image,
        ],
      });
      console.log("contract call success", data);
    } catch (error) {
      console.log("contract call failure", error);
    }
  }

  const getCampaigns = async () => {
    const campaigns = await contract.call('getCampaigns');
    const parsedCampaigns = campaigns.map((campaign, i) => ({
      owner: campaign.owner,
      title: campaign.title,
      description: campaign.description,
      target: ethers.utils.formatEther(campaign.target.toString()),
      deadline: campaign.deadline.toNumber(),
      amountCollected: ethers.utils.formatEther(campaign.amountCollected.toString()),
      image: campaign.image,
      pId: i
    }));
    return parsedCampaigns;
  }

  const getUserCampaigns = async () => {
    const allCampaigns = await getCampaigns();
    return allCampaigns.filter((campaign) => campaign.owner === address);
  }

  const donate = async (pId, amount) => {
    const data = await contract.call('donateToCampaign', [pId], { 
      value: ethers.utils.parseEther(amount) 
    });
    return data;
  }

  const getDonations = async (pId) => {
    const donations = await contract.call('getDonators', [pId]);
    const numberOfDonations = donations[0].length;
    const parsedDonations = [];
    for(let i = 0; i < numberOfDonations; i++) {
      parsedDonations.push({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString())
      });
    }
    return parsedDonations;
  }

  return (
    <StateContext.Provider
      value={{ 
        address,
        contract,
        connect: connectWallet,
        createCampaign: publishCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations
      }}
    >
      {children}
    </StateContext.Provider>
  )
}

export const useStateContext = () => useContext(StateContext);