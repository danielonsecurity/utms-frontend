import { DynamicExpressions } from "../../components/dynamic/DynamicExpressions";
import "./Dynamic.css";

export const Dynamic = () => {
  return (
    <div className="page page--dynamic">
      <div className="page__header">
        <h1 className="page__title">Dynamic Expressions</h1>
      </div>
      <div className="page__content">
        <DynamicExpressions />
      </div>
    </div>
  );
};
