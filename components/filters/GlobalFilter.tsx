"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
} from "@/components/ui/select";
import { formUrlQuery } from "@/lib/url";
import { cn } from "@/lib/utils";
import CommonFilter from "./CommonFilter";
import { useState } from "react";
import { GlobalSearchFilters } from "@/constants/filters";

const GlobalFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const typeParams = searchParams.get("type");

  const [active, setActive] = useState(typeParams || "");

  const handleTypeClick = (value: string) => {
    let newUrl = "";

    if (active === value) {
      setActive("");
      newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "type",
        value: null,
      });
    } else {
      setActive(value);
      newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "type",
        value,
      });
    }

    router.push(newUrl, { scroll: false });
  };

  return (
    <div className="flex items-center gap-5 px-5">
      <Select
        onValueChange={handleTypeClick}
        defaultValue={typeParams || undefined}
      >
        <SelectTrigger
          className="body-regular no-focus light-border background-light800_dark300 text-dark500_light700 border px-5 py-2.5"
          aria-label="Filter options"
        >
          <div className="line-clamp-1 flex-1 text-left">
            <SelectValue placeholder="Select a filter" />
          </div>
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {GlobalSearchFilters.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default GlobalFilter;
