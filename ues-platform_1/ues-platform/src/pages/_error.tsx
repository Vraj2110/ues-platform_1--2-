import { NextPageContext } from "next";

function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>{statusCode ? `An error ${statusCode} occurred on server` : "An error occurred on client"}</h1>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 444;
  return { statusCode };
};

export default Error;
