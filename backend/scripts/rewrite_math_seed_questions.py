"""One-off rewrite of the 49 math-section seed questions' math notation.

Supersedes convert_seed_math_to_latex.py, which converted ASCII math
(x^2, sqrt(...), a/b) to LaTeX token-by-token: each exponent/fraction/sqrt
got its own tiny $...$ span. That breaks for anything with a parenthesized
base (e.g. "(x+5)^2" -> the regex grabbed "5)" as the base instead of the
whole "(x+5)"), producing a visible patchwork of KaTeX-rendered fragments
next to untouched plain-text pieces of the SAME equation.

This script instead applies a hand-authored, whole-expression rewrite for
each of the 49 math rows (read from CORRECTIONS below, in the same order
the rows appear in the seed file) so every complete equation/expression in
a question renders as one coherent $...$ span, matching how it would look
typeset on paper. The 55 reading_writing rows have no math content and are
left untouched.

Usage: python3 scripts/rewrite_math_seed_questions.py
Reads and writes data/sample_sat_questions_seed.jsonl in place (the
previous version is recoverable via git).
"""

import json
from pathlib import Path

SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "sample_sat_questions_seed.jsonl"

# One entry per math-section row, in file order. Each `prompt` value is
# written back into whichever key (`prompt` or `question`) the original
# item used, so the seed's existing minimal/rich field-name mix is
# preserved (see seed_sat_questions.normalize_seed_item).
CORRECTIONS = [
    {
        "prompt": "What is $x$ if $2x + 5 = 15$?",
        "choices": {"A": "3", "B": "5", "C": "8", "D": "10"},
        "explanation": "Subtract 5 from both sides to get $2x = 10$, then divide by 2 to get $x = 5$.",
    },
    {
        "prompt": "If $3x - 4 = 11$, what is the value of $x$?",
        "choices": {"A": "3", "B": "4", "C": "5", "D": "7"},
        "explanation": "Add 4 to both sides to get $3x = 15$, then divide by 3 to get $x = 5$.",
    },
    {
        "prompt": r"A store discounts a \$80 jacket by 25%. What is the sale price?",
        "choices": {"A": r"\$20", "B": r"\$40", "C": r"\$60", "D": r"\$75"},
        "explanation": "25% of 80 is 20, so the sale price is $80 - 20 = 60$.",
    },
    {
        "prompt": "If $f(x) = x^2 + 3$, what is $f(4)$?",
        "choices": {"A": "7", "B": "12", "C": "16", "D": "19"},
        "explanation": "Substitute 4 for $x$. Since 4 squared is 16, $f(4) = 16 + 3 = 19$.",
    },
    {
        "prompt": "If $4(x - 6) = 2x + 10$, what is the value of $x$?",
        "choices": {"A": "8", "B": "12", "C": "17", "D": "34"},
        "explanation": (
            "Distribute: $4x - 24 = 2x + 10$. Subtract $2x$: $2x - 24 = 10$. "
            "Add 24: $2x = 34$. Divide by 2: $x = 17$."
        ),
    },
    {
        "prompt": "$3x + 4y = 18$ and $x - 2y = 6$. What is the value of $x$ in this system of equations?",
        "choices": {"A": "2", "B": "4", "C": "6", "D": "8"},
        "explanation": (
            "Solve the second equation for $x$: $x = 2y + 6$. Substitute into the first: "
            "$3(2y+6) + 4y = 18$ → $10y + 18 = 18$ → $y = 0$. Then $x = 2(0) + 6 = 6$."
        ),
    },
    {
        "prompt": (
            r"A catering company charges a flat setup fee of \$150 plus \$25 per guest. "
            r"If a client wants to spend a maximum of \$1,200 on food and setup for an event, "
            "which inequality models the possible number of guests, $g$, that can attend?"
        ),
        "choices": {
            "A": "$150g + 25 \\leq 1,200$",
            "B": "$25g + 150 \\leq 1,200$",
            "C": "$25g + 150 \\geq 1,200$",
            "D": "$175g \\leq 1,200$",
        },
        "explanation": (
            r"Total cost = flat fee (\$150) + \$25 per guest ($25g$), and the client wants this "
            "at most \\$1,200, giving $25g + 150 \\leq 1,200$."
        ),
    },
    {
        "prompt": "A line in the $xy$-plane passes through the points $(2, -5)$ and $(6, 7)$. What is the slope of this line?",
        "choices": {"A": "-3", "B": "$\\frac{1}{3}$", "C": "3", "D": "4"},
        "explanation": "Slope $= \\frac{7 - (-5)}{6 - 2} = \\frac{12}{4} = 3$.",
    },
    {
        "prompt": (
            "The function $f(x) = 1.25x + 3.50$ models the total cost, in dollars, for a taxi "
            "ride of $x$ miles. What is the best interpretation of the value $1.25$ in this context?"
        ),
        "choices": {
            "A": "The flat pickup fee charged before the ride begins.",
            "B": "The total cost of a 1-mile taxi ride.",
            "C": "The cost per mile of the taxi ride.",
            "D": "The maximum distance of a taxi ride.",
        },
        "explanation": (
            "In $y = mx + b$ form, the coefficient of $x$ ($1.25$) is the slope, representing "
            "the rate of change — the cost per mile."
        ),
    },
    {
        "prompt": (
            r"A movie theater sells adult tickets for \$12 each and child tickets for \$8 each. "
            r"On a certain day, the theater sold 150 tickets and collected a total of \$1,440. "
            "How many adult tickets were sold?"
        ),
        "choices": {"A": "60", "B": "75", "C": "90", "D": "110"},
        "explanation": (
            "Let $a$ = adult, $c$ = child tickets: $a + c = 150$ and $12a + 8c = 1,440$. "
            "Substituting $c = 150 - a$ gives $4a = 240$, so $a = 60$ adult tickets "
            "(check: $12(60) + 8(90) = 720 + 720 = 1,440$)."
        ),
    },
    {
        "prompt": "If $\\frac{2}{3}x - 4 = \\frac{1}{4}x + 1$, what is the value of $x$?",
        "choices": {"A": "4", "B": "6", "C": "10", "D": "12"},
        "explanation": (
            "Multiply everything by 12: $8x - 48 = 3x + 12$. Subtract $3x$: $5x - 48 = 12$. "
            "Add 48: $5x = 60$. Divide by 5: $x = 12$."
        ),
    },
    {
        "prompt": (
            "In the $xy$-plane, a line has a slope of $-\\frac{1}{2}$ and passes through the "
            "point $(4, 3)$. Which of the following is an equation of the line?"
        ),
        "choices": {
            "A": "$y = -\\frac{1}{2}x + 5$",
            "B": "$y = -\\frac{1}{2}x + 1$",
            "C": "$y = -2x + 11$",
            "D": "$y = -\\frac{1}{2}x + 3$",
        },
        "explanation": (
            "Using $y = mx + b$ with $m = -\\frac{1}{2}$ and point $(4,3)$: "
            "$3 = -\\frac{1}{2}(4) + b$ → $3 = -2 + b$ → $b = 5$, giving $y = -\\frac{1}{2}x + 5$."
        ),
    },
    {
        "prompt": "What is the sum of all solutions to the equation $|2x - 5| = 11$?",
        "choices": {"A": "5", "B": "8", "C": "11", "D": "16"},
        "explanation": (
            "Split into $2x - 5 = 11$ ($x = 8$) and $2x - 5 = -11$ ($x = -3$). "
            "Sum of solutions: $8 + (-3) = 5$."
        ),
    },
    {
        "prompt": (
            "$kx - 3y = 12$ and $4x - 6y = 18$ form a system of linear equations, where $k$ is "
            "a constant. If the system has no solution, what is the value of $k$?"
        ),
        "choices": {"A": "2", "B": "4", "C": "6", "D": "8"},
        "explanation": (
            "For no solution, the lines must have equal slopes but different intercepts. "
            "In slope-intercept form: $y = \\frac{k}{3}x - 4$ and $y = \\frac{2}{3}x - 3$. "
            "Setting slopes equal: $\\frac{k}{3} = \\frac{2}{3}$, so $k = 2$."
        ),
    },
    {
        "prompt": (
            "$5x + 2y = c$ and $ax + 4y = 12$ form a system of linear equations, where $a$ and "
            "$c$ are constants. If the system has infinitely many solutions, what is the value "
            "of $a + c$?"
        ),
        "choices": {"A": "10", "B": "16", "C": "22", "D": "26"},
        "explanation": (
            "For infinitely many solutions, the equations must represent the same line. "
            "Doubling the first equation gives $10x + 4y = 2c$, matching $ax + 4y = 12$, "
            "so $a = 10$ and $2c = 12$ → $c = 6$. Thus $a + c = 16$."
        ),
    },
    {
        "prompt": (
            "The shaded region of a graph representing the inequality $y \\geq -\\frac{3}{4}x + b$ "
            "contains the point $(4, 2)$. What is the maximum possible integer value of $b$?"
        ),
        "choices": {"A": "3", "B": "4", "C": "5", "D": "6"},
        "explanation": (
            "Substituting $(4,2)$: $2 \\geq -\\frac{3}{4}(4) + b$ → $2 \\geq -3 + b$ → "
            "$b \\leq 5$. The maximum integer value of $b$ is 5."
        ),
    },
    {
        "prompt": (
            r"A business analyst uses the equation $C(n) = 45n + 1,200$ to estimate the total "
            "operating cost, $C$, in dollars, for a production facility producing $n$ units per "
            r"day. If the facility wants to keep its daily operating cost under \$5,000, what is "
            "the maximum number of units it can produce in a single day?"
        ),
        "choices": {"A": "83", "B": "84", "C": "85", "D": "111"},
        "explanation": (
            "$45n + 1,200 < 5,000$ → $45n < 3,800$ → $n < 84.44$. Since $n$ must be a "
            "whole number, the maximum is 84."
        ),
    },
    {
        "prompt": (
            "A manufacturing plant produces 450 plastic components every 15 minutes. At this "
            "rate, how many components does the plant produce in 4 hours?"
        ),
        "choices": {"A": "1,800", "B": "7,200", "C": "10,800", "D": "72,000"},
        "explanation": (
            "Rate $= \\frac{450}{15} = 30$ components per minute. 4 hours = 240 minutes. "
            "$30 \\times 240 = 7,200$ components."
        ),
    },
    {
        "prompt": "What are the solutions to the equation $2x^2 - 12x + 16 = 0$?",
        "choices": {
            "A": "$x = -2, x = -4$",
            "B": "$x = 2, x = 4$",
            "C": "$x = -2, x = 8$",
            "D": "$x = 1, x = 8$",
        },
        "explanation": "Divide by 2: $x^2 - 6x + 8 = 0$. Factor: $(x-2)(x-4) = 0$, giving $x = 2$ and $x = 4$.",
    },
    {
        "prompt": (
            "The population of a biological culture increases by 8% every hour. If the initial "
            "population was 500 cells, which function $P(t)$ models the population after $t$ hours?"
        ),
        "choices": {
            "A": "$P(t) = 500(0.08)^t$",
            "B": "$P(t) = 500(1.08)^t$",
            "C": "$P(t) = 500 + 1.08t$",
            "D": "$P(t) = 500(1.8)^t$",
        },
        "explanation": (
            "Exponential growth follows $P(t) = P_0(1 + r)^t$, with $P_0 = 500$ and $r = 0.08$, "
            "giving the multiplier $1.08$."
        ),
    },
    {
        "prompt": (
            "The quadratic equation $3x^2 + kx + 12 = 0$ has exactly one real solution. "
            "If $k > 0$, what is the value of $k$?"
        ),
        "choices": {"A": "6", "B": "12", "C": "18", "D": "144"},
        "explanation": (
            "One real solution requires the discriminant $b^2 - 4ac = 0$: "
            "$k^2 - 4(3)(12) = 0$ → $k^2 = 144$ → $k = \\pm 12$. Since $k > 0$, $k = 12$."
        ),
    },
    {
        "prompt": "What is the vertex of the parabola defined by the equation $y = 3(x - 4)^2 + 7$?",
        "choices": {"A": "$(-4, 7)$", "B": "$(4, 7)$", "C": "$(4, -7)$", "D": "$(-4, -7)$"},
        "explanation": (
            "In vertex form $y = a(x-h)^2 + k$, the vertex is $(h, k)$. Here $h = 4$ and $k = 7$, "
            "so the vertex is $(4, 7)$."
        ),
    },
    {
        "prompt": (
            "Which expression is equivalent to $\\frac{(x^3)^4 \\cdot x^{-2}}{x^5}$ for all "
            "positive values of $x$?"
        ),
        "choices": {"A": "$x^5$", "B": "$x^6$", "C": "$x^{10}$", "D": "$x^{15}$"},
        "explanation": (
            "$(x^3)^4 = x^{12}$. Then $x^{12} \\cdot x^{-2} = x^{10}$. "
            "Finally $\\frac{x^{10}}{x^5} = x^5$."
        ),
    },
    {
        "prompt": "If $\\sqrt{3x + 16} - 2 = x$, what is the set of all real solutions for $x$?",
        "choices": {
            "A": "$\\{3\\}$",
            "B": "$\\{-4\\}$",
            "C": "$\\{3, -4\\}$",
            "D": "$\\{3, 4\\}$",
        },
        "explanation": (
            "Isolate and square: $3x+16 = (x+2)^2$ → $x^2 + x - 12 = 0$ → "
            "$(x+4)(x-3) = 0$, giving $x = -4$ or $x = 3$. Checking in the original equation, "
            "$x = 3$ works but $x = -4$ is extraneous, so the solution set is $\\{3\\}$."
        ),
    },
    {
        "prompt": (
            "If the graph of the function $f(x) = x^2$ is shifted 3 units to the right and 5 "
            "units down, what is the equation of the resulting graph, $g(x)$?"
        ),
        "choices": {
            "A": "$g(x) = (x+3)^2 - 5$",
            "B": "$g(x) = (x-3)^2 - 5$",
            "C": "$g(x) = (x-3)^2 + 5$",
            "D": "$g(x) = (x+3)^2 + 5$",
        },
        "explanation": (
            "A shift right by $h$ replaces $x$ with $(x - h)$; a shift down by $k$ subtracts "
            "$k$ from the function. With $h = 3$ and $k = 5$, $g(x) = (x-3)^2 - 5$."
        ),
    },
    {
        "prompt": (
            "Which of the following values of $x$ is not in the domain of the function "
            "$f(x) = \\frac{x^2 - 9}{2x^2 - 10x - 12}$?"
        ),
        "choices": {"A": "-3", "B": "-1", "C": "3", "D": "4"},
        "explanation": (
            "Set the denominator to zero: $2x^2 - 10x - 12 = 0$ → $x^2 - 5x - 6 = 0$ → "
            "$(x-6)(x+1) = 0$, so $x = 6$ or $x = -1$ are excluded from the domain. Among the "
            "choices, $-1$ is not in the domain."
        ),
    },
    {
        "prompt": "Let $f(x) = 2x - 3$ and $g(x) = x^2 + 1$. What is the value of $f(g(3))$?",
        "choices": {"A": "10", "B": "17", "C": "20", "D": "35"},
        "explanation": "$g(3) = 3^2 + 1 = 10$. Then $f(10) = 2(10) - 3 = 17$.",
    },
    {
        "prompt": (
            "$x^2 + y^2 = 25$ and $y = x + 1$ form a system of equations that has two real "
            "coordinate solutions. If $(x, y)$ is a solution and $x > 0$, what is the value of $x$?"
        ),
        "choices": {"A": "3", "B": "4", "C": "5", "D": "7"},
        "explanation": (
            "Substituting $y = x+1$ into the circle equation: $x^2 + (x+1)^2 = 25$ → "
            "$2x^2 + 2x - 24 = 0$ → $x^2 + x - 12 = 0$ → $(x+4)(x-3) = 0$, giving "
            "$x = -4$ or $x = 3$. Since $x > 0$, $x = 3$."
        ),
    },
    {
        "prompt": (
            "The graph of $y = f(x)$ is shown in the $xy$-plane, where $f(x) = (x-1)(x+2)(x-3)$. "
            "What are the $x$-intercepts of the graph?"
        ),
        "choices": {
            "A": "$(1, 0), (2, 0), (3, 0)$",
            "B": "$(-1, 0), (2, 0), (-3, 0)$",
            "C": "$(1, 0), (-2, 0), (3, 0)$",
            "D": "$(-1, 0), (-2, 0), (-3, 0)$",
        },
        "explanation": (
            "Setting $f(x) = 0$: $(x-1)(x+2)(x-3) = 0$ gives $x = 1$, $x = -2$, and $x = 3$, "
            "so the intercepts are $(1,0)$, $(-2,0)$, and $(3,0)$."
        ),
    },
    {
        "prompt": (
            r"An initial investment of \$2,000 earns 4% annual interest compounded monthly. "
            "Which equation models the total value, $V(t)$, in dollars, of the investment "
            "after $t$ years?"
        ),
        "choices": {
            "A": "$V(t) = 2,000(1.04)^t$",
            "B": "$V(t) = 2,000(1.04)^{12t}$",
            "C": "$V(t) = 2,000\\left(1 + \\frac{0.04}{12}\\right)^{12t}$",
            "D": "$V(t) = 2,000\\left(1 + \\frac{0.04}{12}\\right)^t$",
        },
        "explanation": (
            "Using $V(t) = P\\left(1 + \\frac{r}{n}\\right)^{nt}$ with $P = 2,000$, $r = 0.04$, "
            "and $n = 12$ (monthly compounding) gives "
            "$V(t) = 2,000\\left(1 + \\frac{0.04}{12}\\right)^{12t}$."
        ),
    },
    {
        "prompt": (
            "A marble is drawn at random from a bag containing 8 red marbles, 6 blue marbles, "
            "and 4 green marbles. What is the probability that the drawn marble is NOT blue?"
        ),
        "choices": {
            "A": "$\\frac{1}{3}$",
            "B": "$\\frac{4}{9}$",
            "C": "$\\frac{2}{3}$",
            "D": "$\\frac{7}{9}$",
        },
        "explanation": "Total marbles = 18. Non-blue (red + green) = 12. Probability $= \\frac{12}{18} = \\frac{2}{3}$.",
    },
    {
        "prompt": (
            "A dataset consists of the numbers: 10, 12, 15, 18, 20. If a new data point with a "
            "value of 45 is added to the dataset, how will the median change?"
        ),
        "choices": {
            "A": "It will increase from 15 to 16.5.",
            "B": "It will increase from 15 to 18.",
            "C": "It will decrease.",
            "D": "It will stay the same.",
        },
        "explanation": (
            "The original median (middle of 5 values) is 15. With 45 added, the sorted list "
            "has 6 values, so the median is the average of the two middle numbers, 15 and 18: "
            "$\\frac{15+18}{2} = 16.5$."
        ),
    },
    {
        "prompt": (
            "To mix a specific shade of green paint, a painter mixes blue paint and yellow "
            "paint in a ratio of 5 to 3. If the painter needs to create a total of 24 gallons "
            "of green paint, how many gallons of yellow paint are required?"
        ),
        "choices": {"A": "9", "B": "12", "C": "15", "D": "16"},
        "explanation": (
            "The ratio 5:3 has 8 total parts, and yellow is $\\frac{3}{8}$ of the mixture. "
            "$\\frac{3}{8} \\times 24 = 9$ gallons."
        ),
    },
    {
        "prompt": (
            "An industrial pump can move liquid at a rate of 12 gallons per minute. What is "
            "this pumping rate in quarts per hour? (1 gallon = 4 quarts)"
        ),
        "choices": {"A": "48", "B": "720", "C": "1,440", "D": "2,880"},
        "explanation": "$12 \\times 4 = 48$ quarts/min. $48 \\times 60 = 2,880$ quarts/hour.",
    },
    {
        "prompt": (
            "The average score of 15 students on a science exam was 80. If 10 more students "
            "took a makeup version of the exam and averaged a score of 90, what is the combined "
            "average score of all 25 students?"
        ),
        "choices": {"A": "83.5", "B": "84", "C": "85", "D": "86"},
        "explanation": (
            "Total points: $15 \\times 80 = 1,200$ and $10 \\times 90 = 900$, summing to "
            "$2,100$. Divide by 25 total students: $\\frac{2,100}{25} = 84$."
        ),
    },
    {
        "prompt": (
            "Based on a scatterplot correlating hours of study ($x$) with test scores ($y$), "
            "the linear line of best fit is calculated as $y = 6.2x + 45$. If a student studied "
            "for 6 hours, what is their predicted test score?"
        ),
        "choices": {"A": "45", "B": "76", "C": "82", "D": "82.2"},
        "explanation": "Substitute $x = 6$: $y = 6.2(6) + 45 = 37.2 + 45 = 82.2$.",
    },
    {
        "prompt": (
            "Survey data:\n"
            "Age Group | Prefer Online Shopping | Prefer In-Store Shopping | Total\n"
            "Under 30 | 45 | 15 | 60\n"
            "30 and Over | 25 | 40 | 65\n"
            "Total | 70 | 55 | 125\n"
            "If a respondent is selected at random from those who prefer in-store shopping, "
            "what is the probability that they are in the ‘30 and Over’ age group?"
        ),
        "choices": {
            "A": "$\\frac{40}{65}$",
            "B": "$\\frac{40}{55}$",
            "C": "$\\frac{40}{125}$",
            "D": "$\\frac{65}{125}$",
        },
        "explanation": (
            'This is a conditional probability: restrict to the "Prefer In-Store Shopping" '
            'column total (55), and within that group 40 are "30 and Over," giving $\\frac{40}{55}$.'
        ),
    },
    {
        "prompt": (
            r"The price of a laptop is discounted by 15%, and then a 6% sales tax is applied to "
            r"the discounted price. If the original price of the laptop was \$800, what was the "
            "final cost?"
        ),
        "choices": {"A": r"\$680.00", "B": r"\$720.80", "C": r"\$728.00", "D": r"\$768.00"},
        "explanation": (
            r"Discounted price: $800 \times 0.85 = 680$, i.e. \$680. Applying 6% tax: "
            r"$680 \times 1.06 = 720.80$, i.e. \$720.80."
        ),
    },
    {
        "prompt": (
            "Data Set 1: $\\{5, 5, 5, 5, 5\\}$. Data Set 2: $\\{3, 4, 5, 6, 7\\}$. Which "
            "statement is true regarding the standard deviations of Data Set 1 and Data Set 2?"
        ),
        "choices": {
            "A": "The standard deviation of Data Set 1 is equal to the standard deviation of Data Set 2.",
            "B": "The standard deviation of Data Set 1 is greater than the standard deviation of Data Set 2.",
            "C": "The standard deviation of Data Set 1 is less than the standard deviation of Data Set 2.",
            "D": "The standard deviation cannot be compared without knowing the sample sizes.",
        },
        "explanation": (
            "Data Set 1 has zero variability (all values identical), so its standard deviation "
            "is 0, which is less than Data Set 2’s nonzero standard deviation (values "
            "ranging from 3 to 7)."
        ),
    },
    {
        "prompt": (
            "A dataset contains 8 values: 14, 18, 22, 19, 15, 30, $x$, 25. If the range of the "
            "dataset is 20, and $x > 30$, what is the value of $x$?"
        ),
        "choices": {"A": "34", "B": "35", "C": "38", "D": "44"},
        "explanation": (
            "Excluding $x$, the minimum is 14. Since $x > 30$, $x$ is the new maximum, so "
            "Range $= x - 14 = 20$, giving $x = 34$."
        ),
    },
    {
        "prompt": (
            r"A small business reported a revenue of \$45,000 in 2024. In 2025, the business "
            r"reported a revenue of \$58,500. What was the percent increase in revenue from "
            "2024 to 2025?"
        ),
        "choices": {"A": "23%", "B": "30%", "C": "35%", "D": "130%"},
        "explanation": "Increase $= 58,500 - 45,000 = 13,500$. $\\frac{13,500}{45,000} = 0.30$, or 30%.",
    },
    {
        "prompt": (
            "A study of 500 randomly selected high school students in a school district found "
            "that 72% participated in at least one extracurricular sport. Which of the "
            "following is a valid generalization based on this study?"
        ),
        "choices": {
            "A": "Exactly 72% of all high school students in the entire nation participate in sports.",
            "B": "Approximately 72% of all high school students in this specific school district participate in sports.",
            "C": "If a student from this district is selected at random, there is a 100% chance they participate in sports.",
            "D": "Sports are more popular among high school students than academic clubs in this district.",
        },
        "explanation": (
            "A random sample from a specific district generalizes (approximately, with margin "
            "of error) only to that district’s population — not the whole nation (A), "
            "not a certainty for any individual (C), and the study never compared sports to "
            "academic clubs (D)."
        ),
    },
    {
        "prompt": (
            "A concrete mix requires sand, gravel, and cement in a ratio of 3:5:2 by weight. If "
            "a construction project requires 5,000 kilograms of concrete mix, how many "
            "kilograms of gravel are needed?"
        ),
        "choices": {"A": "1,000", "B": "1,500", "C": "2,500", "D": "3,000"},
        "explanation": (
            "Total parts $= 3+5+2 = 10$. Gravel is $\\frac{5}{10} = \\frac{1}{2}$ of the "
            "mixture. $\\frac{1}{2} \\times 5,000 = 2,500$ kg."
        ),
    },
    {
        "prompt": (
            "In the $xy$-plane, a circle is defined by the equation $(x+5)^2 + (y-2)^2 = 49$. "
            "What is the center and the radius of this circle?"
        ),
        "choices": {
            "A": "Center: $(5, -2)$; Radius: 7",
            "B": "Center: $(-5, 2)$; Radius: 7",
            "C": "Center: $(-5, 2)$; Radius: 49",
            "D": "Center: $(5, -2)$; Radius: 49",
        },
        "explanation": (
            "In the standard form $(x-h)^2 + (y-k)^2 = r^2$, matching "
            "$(x+5)^2 + (y-2)^2 = 49$ gives $h = -5$, $k = 2$, and $r^2 = 49$ so $r = 7$. "
            "Center: $(-5, 2)$; Radius: 7."
        ),
    },
    {
        "prompt": (
            "In a right triangle $ABC$, the measure of angle $B$ is $90^\\circ$. If "
            "$\\sin(A) = \\frac{8}{17}$, what is the value of $\\cos(C)$?"
        ),
        "choices": {
            "A": "$\\frac{8}{17}$",
            "B": "$\\frac{15}{17}$",
            "C": "$\\frac{17}{8}$",
            "D": "$\\frac{17}{15}$",
        },
        "explanation": (
            "Since angles $A$ and $C$ are complementary ($A + C = 90^\\circ$), the co-function "
            "identity gives $\\sin(A) = \\cos(C)$, so $\\cos(C) = \\frac{8}{17}$."
        ),
    },
    {
        "prompt": (
            "A circle has a radius of 18 centimeters. What is the length, in centimeters, of "
            "an arc intercepted by a central angle of $120^\\circ$?"
        ),
        "choices": {
            "A": "$6\\pi$",
            "B": "$12\\pi$",
            "C": "$18\\pi$",
            "D": "$36\\pi$",
        },
        "explanation": (
            "Circumference $= 2\\pi(18) = 36\\pi$ cm. The central angle is "
            "$\\frac{120^\\circ}{360^\\circ} = \\frac{1}{3}$ of the circle, so arc length "
            "$= \\frac{1}{3}(36\\pi) = 12\\pi$ cm."
        ),
    },
    {
        "prompt": (
            "A cylindrical water container has a diameter of 8 inches and a height of 10 "
            "inches. What is the volume, in cubic inches, of the cylinder?"
        ),
        "choices": {
            "A": "$80\\pi$",
            "B": "$160\\pi$",
            "C": "$320\\pi$",
            "D": "$640\\pi$",
        },
        "explanation": (
            "Radius = diameter ÷ 2 = 4 inches. Volume "
            "$= \\pi r^2 h = \\pi(4)^2(10) = 160\\pi$ cubic inches."
        ),
    },
    {
        "prompt": (
            "A rectangular garden has a length of 12 meters and a diagonal path measuring 15 "
            "meters. What is the width, in meters, of the garden?"
        ),
        "choices": {"A": "9", "B": "10", "C": "11", "D": "13"},
        "explanation": (
            "By the Pythagorean theorem: $w^2 + 12^2 = 15^2$ → $w^2 + 144 = 225$ → "
            "$w^2 = 81$ → $w = 9$ (a 9-12-15 triangle, a scaled 3-4-5 triple)."
        ),
    },
    {
        "prompt": (
            "In right triangle $DEF$, the right angle is at $E$. If $\\cos(D) = \\frac{5}{13}$, "
            "what is the value of $\\tan(D)$?"
        ),
        "choices": {
            "A": "$\\frac{5}{12}$",
            "B": "$\\frac{12}{13}$",
            "C": "$\\frac{12}{5}$",
            "D": "$\\frac{13}{5}$",
        },
        "explanation": (
            "$\\cos(D) = \\frac{\\text{adjacent}}{\\text{hypotenuse}} = \\frac{5}{13}$. By the "
            "Pythagorean theorem, the opposite side $= \\sqrt{13^2 - 5^2} = 12$. "
            "$\\tan(D) = \\frac{\\text{opposite}}{\\text{adjacent}} = \\frac{12}{5}$."
        ),
    },
]


def main() -> None:
    lines = SEED_PATH.read_text().splitlines()
    correction_index = 0
    out_lines = []
    for line in lines:
        if not line.strip():
            out_lines.append(line)
            continue
        item = json.loads(line)
        if item.get("section") == "math":
            correction = CORRECTIONS[correction_index]
            correction_index += 1
            field = "prompt" if "prompt" in item else "question"
            item[field] = correction["prompt"]
            item["choices"] = correction["choices"]
            item["explanation"] = correction["explanation"]
        out_lines.append(json.dumps(item))

    if correction_index != len(CORRECTIONS):
        raise SystemExit(
            f"Applied {correction_index} corrections but CORRECTIONS has {len(CORRECTIONS)} "
            "entries — seed file's math-row count changed, review before proceeding."
        )

    SEED_PATH.write_text("\n".join(out_lines) + "\n")
    print(f"Rewrote {correction_index} math-section rows in {SEED_PATH}")


if __name__ == "__main__":
    main()
