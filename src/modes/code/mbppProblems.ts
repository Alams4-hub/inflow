// 40 beginner problems from MBPP ("Mostly Basic Python Problems") by Google Research
// (Austin et al., 2021): https://github.com/google-research/google-research/tree/master/mbpp
// Picked from the hand-checked set. Each one was verified: the official solution passes all 3 tests.

export type MbppEntry = {
  id: number;
  title: string;
  prompt: string;
  fn: string;
  sig: string;
  tests: { name: string; assert: string }[];
};

export const MBPP: MbppEntry[] = [
  {
    "id": 4,
    "title": "Find the n largest integers from a given list of numbers, returned in descending order",
    "prompt": "Write a function to find the n largest integers from a given list of numbers, returned in descending order.",
    "fn": "heap_queue_largest",
    "sig": "nums,n",
    "tests": [
      {
        "name": "heap_queue_largest( [25, 35, 22, 85, 14, 65, 75, 22, 58],3)",
        "assert": "assert heap_queue_largest( [25, 35, 22, 85, 14, 65, 75, 22, 58],3)==[85, 75, 65]"
      },
      {
        "name": "heap_queue_largest( [25, 35, 22, 85, 14, 65, 75, 22, 58],2)",
        "assert": "assert heap_queue_largest( [25, 35, 22, 85, 14, 65, 75, 22, 58],2)==[85, 75]"
      },
      {
        "name": "heap_queue_largest( [25, 35, 22, 85, 14, 65, 75, 22, 58],5)",
        "assert": "assert heap_queue_largest( [25, 35, 22, 85, 14, 65, 75, 22, 58],5)==[85, 75, 65, 58, 35]"
      }
    ]
  },
  {
    "id": 12,
    "title": "Sort a given matrix in ascending order according to the sum of its rows",
    "prompt": "Write a function to sort a given matrix in ascending order according to the sum of its rows.",
    "fn": "sort_matrix",
    "sig": "M",
    "tests": [
      {
        "name": "sort_matrix([[1, 2, 3], [2, 4, 5], [1, 1, 1]])",
        "assert": "assert sort_matrix([[1, 2, 3], [2, 4, 5], [1, 1, 1]])==[[1, 1, 1], [1, 2, 3], [2, 4, 5]]"
      },
      {
        "name": "sort_matrix([[1, 2, 3], [-2, 4, -5], [1, -1, 1]])",
        "assert": "assert sort_matrix([[1, 2, 3], [-2, 4, -5], [1, -1, 1]])==[[-2, 4, -5], [1, -1, 1], [1, 2, 3]]"
      },
      {
        "name": "sort_matrix([[5,8,9],[6,4,3],[2,1,4]])",
        "assert": "assert sort_matrix([[5,8,9],[6,4,3],[2,1,4]])==[[2, 1, 4], [6, 4, 3], [5, 8, 9]]"
      }
    ]
  },
  {
    "id": 65,
    "title": "Flatten a list and sum all of its elements",
    "prompt": "Write a function to flatten a list and sum all of its elements.",
    "fn": "recursive_list_sum",
    "sig": "data_list",
    "tests": [
      {
        "name": "recursive_list_sum(([1, 2, [3,4],[5,6]]))",
        "assert": "assert recursive_list_sum(([1, 2, [3,4],[5,6]]))==21"
      },
      {
        "name": "recursive_list_sum(([7, 10, [15,14],[19,41]]))",
        "assert": "assert recursive_list_sum(([7, 10, [15,14],[19,41]]))==106"
      },
      {
        "name": "recursive_list_sum(([10, 20, [30,40],[50,60]]))",
        "assert": "assert recursive_list_sum(([10, 20, [30,40],[50,60]]))==210"
      }
    ]
  },
  {
    "id": 75,
    "title": "Find tuples which have all elements divisible by k from the given list of tuples",
    "prompt": "Write a function to find tuples which have all elements divisible by k from the given list of tuples.",
    "fn": "find_tuples",
    "sig": "test_list, K",
    "tests": [
      {
        "name": "find_tuples([(6, 24, 12), (7, 9, 6), (12, 18, 21)], 6)",
        "assert": "assert find_tuples([(6, 24, 12), (7, 9, 6), (12, 18, 21)], 6) == [(6, 24, 12)]"
      },
      {
        "name": "find_tuples([(5, 25, 30), (4, 2, 3), (7, 8, 9)], 5)",
        "assert": "assert find_tuples([(5, 25, 30), (4, 2, 3), (7, 8, 9)], 5) == [(5, 25, 30)]"
      },
      {
        "name": "find_tuples([(7, 9, 16), (8, 16, 4), (19, 17, 18)], 4)",
        "assert": "assert find_tuples([(7, 9, 16), (8, 16, 4), (19, 17, 18)], 4) == [(8, 16, 4)]"
      }
    ]
  },
  {
    "id": 92,
    "title": "Check whether the given number is undulating or not",
    "prompt": "Write a function to check whether the given number is undulating or not.",
    "fn": "is_undulating",
    "sig": "n",
    "tests": [
      {
        "name": "is_undulating(1212121)",
        "assert": "assert is_undulating(1212121) == True"
      },
      {
        "name": "is_undulating(1991)",
        "assert": "assert is_undulating(1991) == False"
      },
      {
        "name": "is_undulating(121)",
        "assert": "assert is_undulating(121) == True"
      }
    ]
  },
  {
    "id": 100,
    "title": "Find the next smallest palindrome of a specified integer, returned as an integer",
    "prompt": "Write a function to find the next smallest palindrome of a specified integer, returned as an integer.",
    "fn": "next_smallest_palindrome",
    "sig": "num",
    "tests": [
      {
        "name": "next_smallest_palindrome(99)",
        "assert": "assert next_smallest_palindrome(99)==101"
      },
      {
        "name": "next_smallest_palindrome(1221)",
        "assert": "assert next_smallest_palindrome(1221)==1331"
      },
      {
        "name": "next_smallest_palindrome(120)",
        "assert": "assert next_smallest_palindrome(120)==121"
      }
    ]
  },
  {
    "id": 109,
    "title": "Find the number of numbers with an odd value when rotating a binary string the given number of times",
    "prompt": "Write a python function to find the number of numbers with an odd value when rotating a binary string the given number of times.",
    "fn": "odd_Equivalent",
    "sig": "s,n",
    "tests": [
      {
        "name": "odd_Equivalent(\"011001\",6)",
        "assert": "assert odd_Equivalent(\"011001\",6) == 3"
      },
      {
        "name": "odd_Equivalent(\"11011\",5)",
        "assert": "assert odd_Equivalent(\"11011\",5) == 4"
      },
      {
        "name": "odd_Equivalent(\"1010\",4)",
        "assert": "assert odd_Equivalent(\"1010\",4) == 2"
      }
    ]
  },
  {
    "id": 120,
    "title": "Find the maximum absolute product between numbers in pairs of tuples within a given list",
    "prompt": "Write a function to find the maximum absolute product between numbers in pairs of tuples within a given list.",
    "fn": "max_product_tuple",
    "sig": "list1",
    "tests": [
      {
        "name": "max_product_tuple([(2, 7), (2, 6), (1, 8), (4, 9)] )",
        "assert": "assert max_product_tuple([(2, 7), (2, 6), (1, 8), (4, 9)] )==36"
      },
      {
        "name": "max_product_tuple([(10,20), (15,2), (5,10)] )",
        "assert": "assert max_product_tuple([(10,20), (15,2), (5,10)] )==200"
      },
      {
        "name": "max_product_tuple([(11,44), (10,15), (20,5), (12, 9)] )",
        "assert": "assert max_product_tuple([(11,44), (10,15), (20,5), (12, 9)] )==484"
      }
    ]
  },
  {
    "id": 132,
    "title": "Convert a tuple to a string",
    "prompt": "Write a function to convert a tuple to a string.",
    "fn": "tup_string",
    "sig": "tup1",
    "tests": [
      {
        "name": "tup_string(('e', 'x', 'e', 'r', 'c', 'i', 's', 'e', 's'))",
        "assert": "assert tup_string(('e', 'x', 'e', 'r', 'c', 'i', 's', 'e', 's'))==(\"exercises\")"
      },
      {
        "name": "tup_string(('p','y','t','h','o','n'))",
        "assert": "assert tup_string(('p','y','t','h','o','n'))==(\"python\")"
      },
      {
        "name": "tup_string(('p','r','o','g','r','a','m'))",
        "assert": "assert tup_string(('p','r','o','g','r','a','m'))==(\"program\")"
      }
    ]
  },
  {
    "id": 145,
    "title": "Find the maximum difference between any two elements in a given array",
    "prompt": "Write a python function to find the maximum difference between any two elements in a given array.",
    "fn": "max_Abs_Diff",
    "sig": "arr",
    "tests": [
      {
        "name": "max_Abs_Diff((2,1,5,3))",
        "assert": "assert max_Abs_Diff((2,1,5,3)) == 4"
      },
      {
        "name": "max_Abs_Diff((9,3,2,5,1))",
        "assert": "assert max_Abs_Diff((9,3,2,5,1)) == 8"
      },
      {
        "name": "max_Abs_Diff((3,2,1))",
        "assert": "assert max_Abs_Diff((3,2,1)) == 2"
      }
    ]
  },
  {
    "id": 167,
    "title": "Find the smallest power of 2 greater than or equal to n",
    "prompt": "Write a python function to find the smallest power of 2 greater than or equal to n.",
    "fn": "next_power_of_2",
    "sig": "n",
    "tests": [
      {
        "name": "next_power_of_2(0)",
        "assert": "assert next_power_of_2(0) == 1"
      },
      {
        "name": "next_power_of_2(5)",
        "assert": "assert next_power_of_2(5) == 8"
      },
      {
        "name": "next_power_of_2(17)",
        "assert": "assert next_power_of_2(17) == 32"
      }
    ]
  },
  {
    "id": 227,
    "title": "Find minimum of three numbers",
    "prompt": "Write a function to find minimum of three numbers.",
    "fn": "min_of_three",
    "sig": "a,b,c",
    "tests": [
      {
        "name": "min_of_three(10,20,0)",
        "assert": "assert min_of_three(10,20,0)==0"
      },
      {
        "name": "min_of_three(19,15,18)",
        "assert": "assert min_of_three(19,15,18)==15"
      },
      {
        "name": "min_of_three(-10,-20,-30)",
        "assert": "assert min_of_three(-10,-20,-30)==-30"
      }
    ]
  },
  {
    "id": 249,
    "title": "Find the intersection of two arrays",
    "prompt": "Write a function to find the intersection of two arrays.",
    "fn": "intersection_array",
    "sig": "array_nums1,array_nums2",
    "tests": [
      {
        "name": "intersection_array([1, 2, 3, 5, 7, 8, 9, 10],[1, 2, 4, 8, 9]",
        "assert": "assert intersection_array([1, 2, 3, 5, 7, 8, 9, 10],[1, 2, 4, 8, 9])==[1, 2, 8, 9]"
      },
      {
        "name": "intersection_array([1, 2, 3, 5, 7, 8, 9, 10],[3,5,7,9])",
        "assert": "assert intersection_array([1, 2, 3, 5, 7, 8, 9, 10],[3,5,7,9])==[3,5,7,9]"
      },
      {
        "name": "intersection_array([1, 2, 3, 5, 7, 8, 9, 10],[10,20,30,40])",
        "assert": "assert intersection_array([1, 2, 3, 5, 7, 8, 9, 10],[10,20,30,40])==[10]"
      }
    ]
  },
  {
    "id": 264,
    "title": "Calculate a dog's age in dog's years",
    "prompt": "Write a function to calculate a dog's age in dog's years.",
    "fn": "dog_age",
    "sig": "h_age",
    "tests": [
      {
        "name": "dog_age(12)",
        "assert": "assert dog_age(12)==61"
      },
      {
        "name": "dog_age(15)",
        "assert": "assert dog_age(15)==73"
      },
      {
        "name": "dog_age(24)",
        "assert": "assert dog_age(24)==109"
      }
    ]
  },
  {
    "id": 282,
    "title": "Subtract two lists element-wise",
    "prompt": "Write a function to subtract two lists element-wise.",
    "fn": "sub_list",
    "sig": "nums1,nums2",
    "tests": [
      {
        "name": "sub_list([1, 2, 3],[4,5,6])",
        "assert": "assert sub_list([1, 2, 3],[4,5,6])==[-3,-3,-3]"
      },
      {
        "name": "sub_list([1,2],[3,4])",
        "assert": "assert sub_list([1,2],[3,4])==[-2,-2]"
      },
      {
        "name": "sub_list([90,120],[50,70])",
        "assert": "assert sub_list([90,120],[50,70])==[40,50]"
      }
    ]
  },
  {
    "id": 292,
    "title": "Find quotient of two numbers (rounded down to the nearest integer)",
    "prompt": "Write a python function to find quotient of two numbers (rounded down to the nearest integer).",
    "fn": "find",
    "sig": "n,m",
    "tests": [
      {
        "name": "find(10,3)",
        "assert": "assert find(10,3) == 3"
      },
      {
        "name": "find(4,2)",
        "assert": "assert find(4,2) == 2"
      },
      {
        "name": "find(20,5)",
        "assert": "assert find(20,5) == 4"
      }
    ]
  },
  {
    "id": 304,
    "title": "Find element at a given index after number of rotations",
    "prompt": "Write a python function to find element at a given index after number of rotations.",
    "fn": "find_Element",
    "sig": "arr,ranges,rotations,index",
    "tests": [
      {
        "name": "find_Element([1,2,3,4,5],[[0,2],[0,3]],2,1)",
        "assert": "assert find_Element([1,2,3,4,5],[[0,2],[0,3]],2,1) == 3"
      },
      {
        "name": "find_Element([1,2,3,4],[[0,1],[0,2]],1,2)",
        "assert": "assert find_Element([1,2,3,4],[[0,1],[0,2]],1,2) == 3"
      },
      {
        "name": "find_Element([1,2,3,4,5,6],[[0,1],[0,2]],1,1)",
        "assert": "assert find_Element([1,2,3,4,5,6],[[0,1],[0,2]],1,1) == 1"
      }
    ]
  },
  {
    "id": 309,
    "title": "Find the maximum of two numbers",
    "prompt": "Write a python function to find the maximum of two numbers.",
    "fn": "maximum",
    "sig": "a,b",
    "tests": [
      {
        "name": "maximum(5,10)",
        "assert": "assert maximum(5,10) == 10"
      },
      {
        "name": "maximum(-1,-2)",
        "assert": "assert maximum(-1,-2) == -1"
      },
      {
        "name": "maximum(9,7)",
        "assert": "assert maximum(9,7) == 9"
      }
    ]
  },
  {
    "id": 394,
    "title": "Check if given tuple contains no duplicates",
    "prompt": "Write a function to check if given tuple contains no duplicates.",
    "fn": "check_distinct",
    "sig": "test_tup",
    "tests": [
      {
        "name": "check_distinct((1, 4, 5, 6, 1, 4))",
        "assert": "assert check_distinct((1, 4, 5, 6, 1, 4)) == False"
      },
      {
        "name": "check_distinct((1, 4, 5, 6))",
        "assert": "assert check_distinct((1, 4, 5, 6)) == True"
      },
      {
        "name": "check_distinct((2, 3, 4, 5, 6))",
        "assert": "assert check_distinct((2, 3, 4, 5, 6)) == True"
      }
    ]
  },
  {
    "id": 406,
    "title": "Find whether the parity of a given number is odd",
    "prompt": "Write a python function to find whether the parity of a given number is odd.",
    "fn": "find_Parity",
    "sig": "x",
    "tests": [
      {
        "name": "find_Parity(12)",
        "assert": "assert find_Parity(12) == False"
      },
      {
        "name": "find_Parity(7)",
        "assert": "assert find_Parity(7) == True"
      },
      {
        "name": "find_Parity(10)",
        "assert": "assert find_Parity(10) == False"
      }
    ]
  },
  {
    "id": 412,
    "title": "Remove odd numbers from a given list",
    "prompt": "Write a python function to remove odd numbers from a given list.",
    "fn": "remove_odd",
    "sig": "l",
    "tests": [
      {
        "name": "remove_odd([1,2,3])",
        "assert": "assert remove_odd([1,2,3]) == [2]"
      },
      {
        "name": "remove_odd([2,4,6])",
        "assert": "assert remove_odd([2,4,6]) == [2,4,6]"
      },
      {
        "name": "remove_odd([10,20,3])",
        "assert": "assert remove_odd([10,20,3]) == [10,20]"
      }
    ]
  },
  {
    "id": 420,
    "title": "Find the cube sum of first n even natural numbers",
    "prompt": "Write a python function to find the cube sum of first n even natural numbers.",
    "fn": "cube_Sum",
    "sig": "n",
    "tests": [
      {
        "name": "cube_Sum(2)",
        "assert": "assert cube_Sum(2) == 72"
      },
      {
        "name": "cube_Sum(3)",
        "assert": "assert cube_Sum(3) == 288"
      },
      {
        "name": "cube_Sum(4)",
        "assert": "assert cube_Sum(4) == 800"
      }
    ]
  },
  {
    "id": 426,
    "title": "Filter odd numbers",
    "prompt": "Write a function to filter odd numbers.",
    "fn": "filter_oddnumbers",
    "sig": "nums",
    "tests": [
      {
        "name": "filter_oddnumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])",
        "assert": "assert filter_oddnumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])==[1,3,5,7,9]"
      },
      {
        "name": "filter_oddnumbers([10,20,45,67,84,93])",
        "assert": "assert filter_oddnumbers([10,20,45,67,84,93])==[45,67,93]"
      },
      {
        "name": "filter_oddnumbers([5,7,9,8,6,4,3])",
        "assert": "assert filter_oddnumbers([5,7,9,8,6,4,3])==[5,7,9,3]"
      }
    ]
  },
  {
    "id": 431,
    "title": "Takes two lists and returns true if they have at least one common element",
    "prompt": "Write a function that takes two lists and returns true if they have at least one common element.",
    "fn": "common_element",
    "sig": "list1, list2",
    "tests": [
      {
        "name": "common_element([1,2,3,4,5], [5,6,7,8,9])",
        "assert": "assert common_element([1,2,3,4,5], [5,6,7,8,9])==True"
      },
      {
        "name": "common_element([1,2,3,4,5], [6,7,8,9])",
        "assert": "assert common_element([1,2,3,4,5], [6,7,8,9])==None"
      },
      {
        "name": "common_element(['a','b','c'], ['d','b','e'])",
        "assert": "assert common_element(['a','b','c'], ['d','b','e'])==True"
      }
    ]
  },
  {
    "id": 439,
    "title": "Join a list of multiple integers into a single integer",
    "prompt": "Write a function to join a list of multiple integers into a single integer.",
    "fn": "multiple_to_single",
    "sig": "L",
    "tests": [
      {
        "name": "multiple_to_single([11, 33, 50])",
        "assert": "assert multiple_to_single([11, 33, 50])==113350"
      },
      {
        "name": "multiple_to_single([-1,2,3,4,5,6])",
        "assert": "assert multiple_to_single([-1,2,3,4,5,6])==-123456"
      },
      {
        "name": "multiple_to_single([10,15,20,25])",
        "assert": "assert multiple_to_single([10,15,20,25])==10152025"
      }
    ]
  },
  {
    "id": 447,
    "title": "Find cubes of individual elements in a list",
    "prompt": "Write a function to find cubes of individual elements in a list.",
    "fn": "cube_nums",
    "sig": "nums",
    "tests": [
      {
        "name": "cube_nums([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])",
        "assert": "assert cube_nums([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])==[1, 8, 27, 64, 125, 216, 343, 512, 729, 1000]"
      },
      {
        "name": "cube_nums([10,20,30])",
        "assert": "assert cube_nums([10,20,30])==([1000, 8000, 27000])"
      },
      {
        "name": "cube_nums([12,15])",
        "assert": "assert cube_nums([12,15])==([1728, 3375])"
      }
    ]
  },
  {
    "id": 455,
    "title": "Check whether the given month number contains 31 days or not",
    "prompt": "Write a function to check whether the given month number contains 31 days or not.",
    "fn": "check_monthnumb_number",
    "sig": "monthnum2",
    "tests": [
      {
        "name": "check_monthnumb_number(5)",
        "assert": "assert check_monthnumb_number(5)==True"
      },
      {
        "name": "check_monthnumb_number(2)",
        "assert": "assert check_monthnumb_number(2)==False"
      },
      {
        "name": "check_monthnumb_number(6)",
        "assert": "assert check_monthnumb_number(6)==False"
      }
    ]
  },
  {
    "id": 470,
    "title": "Find the pairwise addition of the neighboring elements of the given tuple",
    "prompt": "Write a function to find the pairwise addition of the neighboring elements of the given tuple.",
    "fn": "add_pairwise",
    "sig": "test_tup",
    "tests": [
      {
        "name": "add_pairwise((1, 5, 7, 8, 10))",
        "assert": "assert add_pairwise((1, 5, 7, 8, 10)) == (6, 12, 15, 18)"
      },
      {
        "name": "add_pairwise((2, 6, 8, 9, 11))",
        "assert": "assert add_pairwise((2, 6, 8, 9, 11)) == (8, 14, 17, 20)"
      },
      {
        "name": "add_pairwise((3, 7, 9, 10, 12))",
        "assert": "assert add_pairwise((3, 7, 9, 10, 12)) == (10, 16, 19, 22)"
      }
    ]
  },
  {
    "id": 479,
    "title": "Find the first digit of a given number",
    "prompt": "Write a python function to find the first digit of a given number.",
    "fn": "first_Digit",
    "sig": "n",
    "tests": [
      {
        "name": "first_Digit(123)",
        "assert": "assert first_Digit(123) == 1"
      },
      {
        "name": "first_Digit(456)",
        "assert": "assert first_Digit(456) == 4"
      },
      {
        "name": "first_Digit(12)",
        "assert": "assert first_Digit(12) == 1"
      }
    ]
  },
  {
    "id": 559,
    "title": "Find the sum of the largest contiguous sublist in the given list",
    "prompt": "Write a function to find the sum of the largest contiguous sublist in the given list.",
    "fn": "max_sub_array_sum",
    "sig": "a, size",
    "tests": [
      {
        "name": "max_sub_array_sum([-2, -3, 4, -1, -2, 1, 5, -3], 8)",
        "assert": "assert max_sub_array_sum([-2, -3, 4, -1, -2, 1, 5, -3], 8) == 7"
      },
      {
        "name": "max_sub_array_sum([-3, -4, 5, -2, -3, 2, 6, -4], 8)",
        "assert": "assert max_sub_array_sum([-3, -4, 5, -2, -3, 2, 6, -4], 8) == 8"
      },
      {
        "name": "max_sub_array_sum([-4, -5, 6, -3, -4, 3, 7, -5], 8)",
        "assert": "assert max_sub_array_sum([-4, -5, 6, -3, -4, 3, 7, -5], 8) == 10"
      }
    ]
  },
  {
    "id": 566,
    "title": "Get the sum of the digits of a non-negative integer",
    "prompt": "Write a function to get the sum of the digits of a non-negative integer.",
    "fn": "sum_digits",
    "sig": "n",
    "tests": [
      {
        "name": "sum_digits(345)",
        "assert": "assert sum_digits(345)==12"
      },
      {
        "name": "sum_digits(12)",
        "assert": "assert sum_digits(12)==3"
      },
      {
        "name": "sum_digits(97)",
        "assert": "assert sum_digits(97)==16"
      }
    ]
  },
  {
    "id": 579,
    "title": "Find the dissimilar elements in the given two tuples",
    "prompt": "Write a function to find the dissimilar elements in the given two tuples.",
    "fn": "find_dissimilar",
    "sig": "test_tup1, test_tup2",
    "tests": [
      {
        "name": "find_dissimilar((3, 4, 5, 6), (5, 7, 4, 10))",
        "assert": "assert find_dissimilar((3, 4, 5, 6), (5, 7, 4, 10)) == (3, 6, 7, 10)"
      },
      {
        "name": "find_dissimilar((1, 2, 3, 4), (7, 2, 3, 9))",
        "assert": "assert find_dissimilar((1, 2, 3, 4), (7, 2, 3, 9)) == (1, 4, 7, 9)"
      },
      {
        "name": "find_dissimilar((21, 11, 25, 26), (26, 34, 21, 36))",
        "assert": "assert find_dissimilar((21, 11, 25, 26), (26, 34, 21, 36)) == (34, 36, 11, 25)"
      }
    ]
  },
  {
    "id": 589,
    "title": "Find perfect squares between two given numbers",
    "prompt": "Write a function to find perfect squares between two given numbers.",
    "fn": "perfect_squares",
    "sig": "a, b",
    "tests": [
      {
        "name": "perfect_squares(1,30)",
        "assert": "assert perfect_squares(1,30)==[1, 4, 9, 16, 25]"
      },
      {
        "name": "perfect_squares(50,100)",
        "assert": "assert perfect_squares(50,100)==[64, 81, 100]"
      },
      {
        "name": "perfect_squares(100,200)",
        "assert": "assert perfect_squares(100,200)==[100, 121, 144, 169, 196]"
      }
    ]
  },
  {
    "id": 600,
    "title": "Check whether the given number is even or not",
    "prompt": "Write a python function to check whether the given number is even or not.",
    "fn": "is_Even",
    "sig": "n",
    "tests": [
      {
        "name": "is_Even(1)",
        "assert": "assert is_Even(1) == False"
      },
      {
        "name": "is_Even(2)",
        "assert": "assert is_Even(2) == True"
      },
      {
        "name": "is_Even(3)",
        "assert": "assert is_Even(3) == False"
      }
    ]
  },
  {
    "id": 623,
    "title": "Compute the n-th power of each number in a list",
    "prompt": "Write a function to compute the n-th power of each number in a list.",
    "fn": "nth_nums",
    "sig": "nums,n",
    "tests": [
      {
        "name": "nth_nums([1, 2, 3, 4, 5, 6, 7, 8, 9, 10],2)",
        "assert": "assert nth_nums([1, 2, 3, 4, 5, 6, 7, 8, 9, 10],2)==[1, 4, 9, 16, 25, 36, 49, 64, 81, 100]"
      },
      {
        "name": "nth_nums([10,20,30],3)",
        "assert": "assert nth_nums([10,20,30],3)==([1000, 8000, 27000])"
      },
      {
        "name": "nth_nums([12,15],5)",
        "assert": "assert nth_nums([12,15],5)==([248832, 759375])"
      }
    ]
  },
  {
    "id": 633,
    "title": "Find the sum of xor of all pairs of numbers in the given list",
    "prompt": "Write a python function to find the sum of xor of all pairs of numbers in the given list.",
    "fn": "pair_xor_Sum",
    "sig": "arr,n",
    "tests": [
      {
        "name": "pair_xor_Sum([5,9,7,6],4)",
        "assert": "assert pair_xor_Sum([5,9,7,6],4) == 47"
      },
      {
        "name": "pair_xor_Sum([7,3,5],3)",
        "assert": "assert pair_xor_Sum([7,3,5],3) == 12"
      },
      {
        "name": "pair_xor_Sum([7,3],2)",
        "assert": "assert pair_xor_Sum([7,3],2) == 4"
      }
    ]
  },
  {
    "id": 643,
    "title": "Checks if a strings contains 'z', except at the start and end of the word",
    "prompt": "Write a function that checks if a strings contains 'z', except at the start and end of the word.",
    "fn": "text_match_wordz_middle",
    "sig": "text",
    "tests": [
      {
        "name": "text_match_wordz_middle(\"pythonzabc.\")",
        "assert": "assert text_match_wordz_middle(\"pythonzabc.\")==True"
      },
      {
        "name": "text_match_wordz_middle(\"zxyabc.\")",
        "assert": "assert text_match_wordz_middle(\"zxyabc.\")==False"
      },
      {
        "name": "text_match_wordz_middle(\"  lang  .\")",
        "assert": "assert text_match_wordz_middle(\"  lang  .\")==False"
      }
    ]
  },
  {
    "id": 760,
    "title": "Check whether a list of numbers contains only one distinct element or not",
    "prompt": "Write a python function to check whether a list of numbers contains only one distinct element or not.",
    "fn": "unique_Element",
    "sig": "arr",
    "tests": [
      {
        "name": "unique_Element([1,1,1])",
        "assert": "assert unique_Element([1,1,1]) == True"
      },
      {
        "name": "unique_Element([1,2,1,2])",
        "assert": "assert unique_Element([1,2,1,2]) == False"
      },
      {
        "name": "unique_Element([1,2,3,4,5])",
        "assert": "assert unique_Element([1,2,3,4,5]) == False"
      }
    ]
  },
  {
    "id": 776,
    "title": "Count those characters which have vowels as their neighbors in the given string",
    "prompt": "Write a function to count those characters which have vowels as their neighbors in the given string.",
    "fn": "count_vowels",
    "sig": "test_str",
    "tests": [
      {
        "name": "count_vowels('bestinstareels')",
        "assert": "assert count_vowels('bestinstareels') == 7"
      },
      {
        "name": "count_vowels('partofthejourneyistheend')",
        "assert": "assert count_vowels('partofthejourneyistheend') == 12"
      },
      {
        "name": "count_vowels('amazonprime')",
        "assert": "assert count_vowels('amazonprime') == 5"
      }
    ]
  },
  {
    "id": 796,
    "title": "Find the sum of all items in the given dictionary",
    "prompt": "Write function to find the sum of all items in the given dictionary.",
    "fn": "return_sum",
    "sig": "dict",
    "tests": [
      {
        "name": "return_sum({'a': 100, 'b':200, 'c':300})",
        "assert": "assert return_sum({'a': 100, 'b':200, 'c':300}) == 600"
      },
      {
        "name": "return_sum({'a': 25, 'b':18, 'c':45})",
        "assert": "assert return_sum({'a': 25, 'b':18, 'c':45}) == 88"
      },
      {
        "name": "return_sum({'a': 36, 'b':39, 'c':49})",
        "assert": "assert return_sum({'a': 36, 'b':39, 'c':49}) == 124"
      }
    ]
  }
];
