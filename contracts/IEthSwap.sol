pragma solidity >=0.6.2 <0.8.0;

interface IEthSwap {
    function convert(uint256 minerMin) external payable;

    function getConversionRate() external view returns (uint256);

    function getConversionAmount(uint256 amount)
        external
        view
        returns (uint256);

    function payments(address dest) external view returns (uint256);
}
