import { getUserTransactions } from "@/api/transaction";
import { Divider, Typography, Container, Box } from "@mui/material";
import { Suspense } from "react";
import { useLoaderData, Await, defer } from "react-router-dom";
import CustomizedTables from "@/components/TransactionsTable";
import SkeletonTable from "@/Skeletons/TableSkeleton";
import ErrorPage from "./ErrorPage";


export const loader = (token) => async () => {
  const transactions = getUserTransactions(token);
  return defer({ transactions });
};

function Transactions() {
  const data = useLoaderData();

  return (
    <div>
      <div className="heading-text">
        <Typography
          variant="h4"
          color="primary"
          style={{
            textAlign: "center",
            margin: "auto",
            cursor: "pointer",
            width: "300px",
            letterSpacing: "-3px",
          }}
          className="underline-effect"
        >
          TRANSACTIONS
        </Typography>
      </div>
      <Divider />
      <Suspense
        fallback={
          <Container>
            <SkeletonTable/>
          </Container>
        }
      >
        <Await
          resolve={data.transactions}
          errorElement={<ErrorPage/>}
        >
          {(res) => (
            <>
              {res.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    marginTop: "5em",
                  }}
                >
                  Nothing in this portfolio yet.<br></br>
                  Add investments to see performance and track returns
                </Box>
              ) : (
                <Container>
                  <CustomizedTables data={res} />
                </Container>
              )}
            </>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

export default Transactions;
