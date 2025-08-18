// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDAOShop {
    event Approval(indexed address owner, indexed address approved, indexed uint256 tokenId);
    event ApprovalForAll(indexed address owner, indexed address operator, bool approved);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);
    event ItemCreated(indexed uint256 tokenId, indexed address creator, string title);
    event ItemUpdated(indexed uint256 tokenId, indexed address updater);
    event MetadataUpdate(uint256 _tokenId);
    event OwnershipTransferred(indexed address previousOwner, indexed address newOwner);
    event Transfer(indexed address from, indexed address to, indexed uint256 tokenId);

    function approve(address to, uint256 tokenId) external;
    function balanceOf(address owner) external view returns (uint256);
    function burnItem(uint256 tokenId) external;
    function createItem(string title, string detail, string imageUrl, string tokenInfo, string contact, string price, string status) external returns (uint256);
    function creatorTokenCount(address creator) external view returns (uint256);
    function getApproved(uint256 tokenId) external view returns (address);
    function getCreatorTokens(address creator) external view returns (uint256[]);
    function getItem(uint256 tokenId) external view returns (tuple);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function items(uint256) external view returns (string title, string detail, string imageUrl, string tokenInfo, string contact, string price, string status, address creator);
    function name() external view returns (string);
    function owner() external view returns (address);
    function ownerOf(uint256 tokenId) external view returns (address);
    function renounceOwnership() external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
    function symbol() external view returns (string);
    function tokenByIndex(uint256 index) external view returns (uint256);
    function tokenOfCreatorByIndex(address creator, uint256 index) external view returns (uint256);
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string);
    function totalSupply() external view returns (uint256);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function transferOwnership(address newOwner) external;
    function updateItem(uint256 tokenId, string title, string detail, string imageUrl, string tokenInfo, string contact, string price, string status) external;
}
