"use client";
import * as React from "react";
import { Input } from "../../ui/input";
import { Check, Edit } from "lucide-react";
import { Button } from "../../ui/button";
import { useNexus } from "../../nexus/NexusProvider";
import { type Address } from "viem";

interface ReceipientAddressProps {
  address?: Address;
  onChange: (address: string) => void;
}

const ReceipientAddress: React.FC<ReceipientAddressProps> = ({
  address,
  onChange,
}) => {
  const { nexusSDK } = useNexus();
  const [isEditing, setIsEditing] = React.useState(false);
  const fallbackTruncate = (value: string, head = 6, tail = 6) => {
    if (!value) return "";
    if (value.length <= head + tail) return value;
    return `${value.slice(0, head)}...${value.slice(-tail)}`;
  };
  const displayAddress =
    address && nexusSDK?.utils?.truncateAddress
      ? nexusSDK.utils.truncateAddress(address, 6, 6)
      : address
        ? fallbackTruncate(address, 6, 6)
        : "";
  return (
    <div className="w-full">
      {isEditing ? (
        <div className="flex items-center w-full justify-between gap-x-4">
          <Input
            value={address}
            placeholder="Enter Recipient Address"
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-base font-medium"
          />
          <Button
            variant={"ghost"}
            size={"icon"}
            onClick={() => {
              setIsEditing(false);
            }}
          >
            <Check className="size-5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center w-full justify-between">
          <p className="font-medium text-base">Recipient Address</p>
          <div className="flex items-center gap-x-3 ">
            <p className="font-medium text-base">{displayAddress}</p>

            <Button
              variant={"ghost"}
              size={"icon"}
              onClick={() => {
                setIsEditing(true);
              }}
              className="px-0 size-5"
            >
              <Edit className="size-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceipientAddress;
