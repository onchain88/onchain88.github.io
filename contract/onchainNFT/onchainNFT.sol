// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts@4.9.0/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@4.9.0/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts@4.9.0/token/common/ERC2981.sol";
import "@openzeppelin/contracts@4.9.0/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.0/utils/Counters.sol";

/**
 * @title onchain88 NFT
 * @notice Optimized NFT contract for onchain88 community
 */
contract onchain88NFT is ERC721, ERC721Enumerable, ERC2981, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // Core data
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) public tokenLocked;
    mapping(uint256 => address) public tokenCreator;

    // Creator management - simplified
    mapping(address => uint256[]) private _creatorTokens;

    // Settings
    uint256 public mintFee;
    string private _contractName = "onchain88 NFT";
    string private _contractSymbol = "CHAIN";

    // Events
    event TokenMinted(uint256 indexed tokenId, address indexed to, address indexed creator);
    event TokenBurned(uint256 indexed tokenId);
    event Locked(uint256 indexed tokenId);

    constructor() ERC721("onchain88 NFT", "CHAIN") {}

    // Override name and symbol
    function name() public view override returns (string memory) {
        return _contractName;
    }

    function symbol() public view override returns (string memory) {
        return _contractSymbol;
    }

    function setName(string memory newName) external onlyOwner {
        _contractName = newName;
    }

    function setSymbol(string memory newSymbol) external onlyOwner {
        _contractSymbol = newSymbol;
    }

    // Core mint function
    function mint(address to, string memory uri, bool isLockedToken) external payable returns (uint256) {
        require(to != address(0), "Zero address");
        require(msg.value >= mintFee, "Fee");
        require(bytes(uri).length > 0, "URI");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        tokenCreator[tokenId] = msg.sender;
        _creatorTokens[msg.sender].push(tokenId);

        if (isLockedToken) {
            tokenLocked[tokenId] = true;
            emit Locked(tokenId);
        }

        _setTokenRoyalty(tokenId, msg.sender, 500); // 5%
        emit TokenMinted(tokenId, to, msg.sender);
        return tokenId;
    }

    // Burn function
    function burn(uint256 tokenId) external {
        require(_isApprovedOrOwner(msg.sender, tokenId) || owner() == msg.sender, "Auth");

        // Clear metadata
        delete _tokenURIs[tokenId];
        delete tokenLocked[tokenId];
        delete tokenCreator[tokenId];
        // Note: Not removing from _creatorTokens to avoid DoS

        _burn(tokenId);
        emit TokenBurned(tokenId);
    }

    // URI functions
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        return _tokenURIs[tokenId];
    }


    // Creator queries
    function tokensOfCreator(address creator) external view returns (uint256[] memory) {
        return _creatorTokens[creator];
    }

    function creatorTokenCount(address creator) external view returns (uint256) {
        return _creatorTokens[creator].length;
    }

    // Type queries - using loops for simplicity
    function getNormalTokens() external view returns (uint256[] memory) {
        uint256 total = totalSupply();
        uint256[] memory temp = new uint256[](total);
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (!tokenLocked[tokenId]) {
                temp[count] = tokenId;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    function getSBTTokens() external view returns (uint256[] memory) {
        uint256 total = totalSupply();
        uint256[] memory temp = new uint256[](total);
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (tokenLocked[tokenId]) {
                temp[count] = tokenId;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    function isLocked(uint256 tokenId) external view returns (bool) {
        _requireMinted(tokenId);
        return tokenLocked[tokenId];
    }

    // Admin functions
    function setMintFee(uint256 fee) external onlyOwner {
        mintFee = fee;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Override to disable renounceOwnership
    function renounceOwnership() public view override onlyOwner {
        revert("Renounce ownership is disabled");
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(feeNumerator <= 2000, "Max 20%");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        require(feeNumerator <= 2000, "Max 20%");
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        require(!tokenLocked[firstTokenId] || from == address(0), "Locked");
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}