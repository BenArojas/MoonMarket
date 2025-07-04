import LeaderBoardsTable from "@/components/LeaderboardTable";
import TopLeaders from "@/components/TopLeaders";
import { leaderboardsStock } from "@/utils/dataProcessing";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Box } from "@mui/material";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import * as React from "react";

interface LeaderboardsProps {
  data: leaderboardsStock[];
  width: number;
  height: number;
}
type CategoryType = "positionSize" | "total" | "default";

export default function Leaderboards({
  data,
  width,
  height,
}: LeaderboardsProps) {
  const [category, setCategory] = React.useState<CategoryType>("positionSize");
  const [page, setPage] = React.useState<number>(1);
  const leadersCount: number = 3;
  const rowsPerPage: number = 5;
  const leaderboardsData: leaderboardsStock[] =
    category === "total"
      ? [...data].sort((a, b) => b.gainLoss - a.gainLoss)
      : category === "positionSize"
      ? [...data].sort((a, b) => b.value - a.value)
      : data;

  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleCategoryChange = (event: SelectChangeEvent<CategoryType>) => {
    setCategory(event.target.value as CategoryType);
  };

  const totalPages = Math.ceil((data.length - 3) / 5) + 1;

  return (
    <Box
      sx={{
        height: height,
        width: width,
        display: "flex",
        flexDirection: "column-reverse",
        justifyContent: "flex-end", // Changed from "center"
        alignItems: "center",
        gap: page === 1 ? 1 : 5,
        position: "relative",
      }}
    >
      <Stack
        spacing={2}
        sx={{
          boxShadow: "0 0 0 1px rgba(211, 211, 211, 0.5)",
          padding: 2,
          width: "100%",
        }}
      >
        <Pagination
          count={totalPages}
          onChange={handleChange}
          page={page}
          renderItem={(item) => (
            <PaginationItem
              slots={{ previous: ArrowBackIcon, next: ArrowForwardIcon }}
              {...item}
            />
          )}
          sx={{
            "& .MuiPagination-ul": {
              gap: 2,
              justifyContent: "center",
            },
          }}
        />
      </Stack>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: 2,
        }}
      >
        <Box sx={{ minWidth: 120 }}>
          <FormControl fullWidth>
            <InputLabel id="demo-simple-select-label">Sort By</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={category}
              label="Category"
              onChange={handleCategoryChange}
            >
              <MenuItem value={"total"}>Money Earned</MenuItem>
              <MenuItem value={"percentage"}>Percentage</MenuItem>
              <MenuItem value={"positionSize"}>Position Size</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      {page === 1 ? (
        <TopLeaders category={category} leaderboardsData={leaderboardsData} />
      ) : (
        <LeaderBoardsTable
          data={leaderboardsData.slice(
            (page - 2) * rowsPerPage + leadersCount,
            (page - 1) * rowsPerPage + leadersCount
          )}
        />
      )}
    </Box>
  );
}
