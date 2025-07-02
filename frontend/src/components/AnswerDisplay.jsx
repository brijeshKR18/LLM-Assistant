import PropTypes from "prop-types";

export default function AnswerDisplay({ answer }) {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-lg my-6 border border-gray-100">
      <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Response</h3>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">{answer}</p>
    </section>
  );
}

AnswerDisplay.propTypes = {
  answer: PropTypes.node.isRequired,
};
